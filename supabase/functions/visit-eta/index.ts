import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function deterministicOffset(seed: string, latScale: number, lngScale: number) {
  let hashA = 0;
  let hashB = 0;
  for (let i = 0; i < seed.length; i++) {
    const code = seed.charCodeAt(i);
    hashA = (hashA * 31 + code) % 1000003;
    hashB = (hashB * 37 + code) % 1000003;
  }

  const normA = (hashA % 1000) / 999; // 0..1
  const normB = (hashB % 1000) / 999; // 0..1

  return {
    lat: (normA - 0.5) * latScale,
    lng: (normB - 0.5) * lngScale,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error("Google Maps API key not configured");
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the patient's appointment via token
    const { data: aptData } = await sb.rpc("get_appointment_by_token", { p_token: token });
    if (!aptData || aptData.length === 0) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const myApt = aptData[0];

    // Stamp tracking_opened_at on first open
    await sb
      .from("appointments")
      .update({ tracking_opened_at: new Date().toISOString() })
      .eq("id", myApt.id)
      .is("tracking_opened_at", null);

    // Get all appointments for this day
    const { data: dayApts } = await sb
      .from("appointments")
      .select("id, appointment_time, status, postcode, latitude, longitude, duration_minutes, delay_notified_at, delay_eta_arrival, locality")
      .eq("appointment_date", myApt.appointment_date)
      .not("status", "in", '("cancelled","rejected")')
      .order("appointment_time", { ascending: true });

    if (!dayApts || dayApts.length === 0) {
      return new Response(JSON.stringify({ eta_minutes: null, message: "No appointments found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const myIndex = dayApts.findIndex((a: any) => a.id === myApt.id);
    const completedApts = dayApts.filter((a: any) => a.status === "completed");
    const completedCount = completedApts.length;

    // Get my appointment's full details (postcode + coords)
    const { data: myFullApt } = await sb
      .from("appointments")
      .select("postcode, latitude, longitude")
      .eq("id", myApt.id)
      .single();

    const myPostcode = myFullApt?.postcode;

    // Determine origin (last completed appointment's postcode, or base)
    const BASE_POSTCODE = "DT2 8DG";
    let originPostcode = BASE_POSTCODE;
    let originLat: number | null = null;
    let originLng: number | null = null;

    if (completedApts.length > 0) {
      const lastCompleted = completedApts[completedApts.length - 1];
      if (lastCompleted.postcode) {
        originPostcode = lastCompleted.postcode;
      }
      if (lastCompleted.latitude != null && lastCompleted.longitude != null) {
        originLat = lastCompleted.latitude;
        originLng = lastCompleted.longitude;
      }
    }

    // Check if "on my way" has been sent for this appointment
    const { data: omwLog } = await sb.from("communications_log")
      .select("id, trigger_type, created_at")
      .eq("appointment_id", myApt.id)
      .in("trigger_type", ["on_my_way", "on_my_way_cancelled", "arrived"])
      .order("created_at", { ascending: true })
      .limit(20);
    const travelEvents = (omwLog || []).filter((l: any) => l.trigger_type === "on_my_way" || l.trigger_type === "on_my_way_cancelled");
    const latestTravelEvent = travelEvents.length > 0 ? travelEvents[travelEvents.length - 1].trigger_type : null;
    const onMyWaySent = latestTravelEvent === "on_my_way";
    const practitionerArrived = omwLog?.some((l: any) => l.trigger_type === "arrived") ?? false;

    // Calculate ahead-of-schedule minutes
    // Use UK local time (Europe/London) since appointment_time is stored in local time
    const ukNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
    const currentMinutesLocal = ukNow.getHours() * 60 + ukNow.getMinutes();

    let aheadOfScheduleMinutes: number | null = null;
    if (completedCount > 0 && myIndex > completedCount) {
      const myHour = parseInt(myApt.appointment_time.slice(0, 2));
      const myMin = parseInt(myApt.appointment_time.slice(3, 5));
      const timeUntilBooked = (myHour * 60 + myMin) - currentMinutesLocal;
      
      let remainingWorkMinutes = 0;
      for (let i = completedCount; i < myIndex; i++) {
        remainingWorkMinutes += dayApts[i].duration_minutes || 60;
        remainingWorkMinutes += 15;
      }
      
      if (timeUntilBooked > remainingWorkMinutes && (timeUntilBooked - remainingWorkMinutes) >= 5) {
        aheadOfScheduleMinutes = timeUntilBooked - remainingWorkMinutes;
      }
    } else if (completedCount > 0 && myIndex <= completedCount) {
      const myHour = parseInt(myApt.appointment_time.slice(0, 2));
      const myMin = parseInt(myApt.appointment_time.slice(3, 5));
      const timeUntilBooked = (myHour * 60 + myMin) - currentMinutesLocal;
      
      // Estimate travel time to this patient (default 15 min)
      let travelToNext = 15;
      if (originPostcode && myPostcode) {
        const { data: cached } = await sb.from("route_cache")
          .select("drive_time_minutes")
          .eq("origin_postcode", originPostcode.toUpperCase().replace(/\s/g, ""))
          .eq("destination_postcode", myPostcode.toUpperCase().replace(/\s/g, ""))
          .maybeSingle();
        if (cached?.drive_time_minutes) {
          travelToNext = cached.drive_time_minutes;
        }
      }
      
      const aheadBy = timeUntilBooked - travelToNext;
      if (aheadBy >= 5) {
        aheadOfScheduleMinutes = aheadBy;
      }
    }

    // Detect "running late" — check ALL upcoming uncompleted appointments
    const myCompleted = dayApts.find((a: any) => a.id === myApt.id)?.status === "completed";

    let runningLate = false;
    // Track which appointment(s) the practitioner is running late for (globally visible)
    const runningLateAptIds: string[] = [];

    // Check each uncompleted appointment to see if practitioner should have departed
    for (let idx = completedCount; idx < dayApts.length; idx++) {
      const apt = dayApts[idx];
      if (apt.status === "completed" || !apt.postcode) continue;

      // Check if on-my-way was sent for this specific appointment
      const { data: omwCheck } = await sb.from("communications_log")
        .select("trigger_type, created_at")
        .eq("appointment_id", apt.id)
        .in("trigger_type", ["on_my_way", "on_my_way_cancelled"])
        .order("created_at", { ascending: true })
        .limit(20);
      const latestTravelEvent = omwCheck && omwCheck.length > 0 ? omwCheck[omwCheck.length - 1].trigger_type : null;
      if (latestTravelEvent === "on_my_way") continue; // already on the way

      let estimatedDriveMinutes = 15;
      if (originPostcode && apt.postcode) {
        const { data: cached } = await sb.from("route_cache")
          .select("drive_time_minutes")
          .eq("origin_postcode", originPostcode.toUpperCase().replace(/\s/g, ""))
          .eq("destination_postcode", apt.postcode.toUpperCase().replace(/\s/g, ""))
          .maybeSingle();
        if (cached?.drive_time_minutes) {
          estimatedDriveMinutes = cached.drive_time_minutes;
        }
      }

      const aptTime = apt.appointment_time;
      const aptHour = parseInt(aptTime.slice(0, 2));
      const aptMin = parseInt(aptTime.slice(3, 5));
      const departByMinutes = aptHour * 60 + aptMin - estimatedDriveMinutes;

      const currentMinutes = currentMinutesLocal;

      if (currentMinutes > departByMinutes) {
        runningLateAptIds.push(apt.id);
        if (apt.id === myApt.id) runningLate = true;

        // Late detection only — no auto SMS. Admin sends manually via dashboard.
      } else if (apt.delay_notified_at || apt.delay_eta_arrival) {
        // Delay was previously set but is no longer active for this appointment.
        // Reset so future ETA defaults to booked time unless delayed again.
        await sb
          .from("appointments")
          .update({ delay_notified_at: null, delay_eta_arrival: null })
          .eq("id", apt.id);
      }
      // Only check the immediate next appointment for late detection
      break;
    }

    // Calculate visits remaining between last completed and this patient
    const visitsBeforeMe = myIndex - completedCount;
    const isNext = visitsBeforeMe <= 0 && completedCount < dayApts.length;

    let etaMinutes: number | null = null;
    let etaText = "";

    // Check if practitioner has started (at least one completed visit)
    const practitionerStarted = completedCount > 0;

    const myIsCurrentlyLate = runningLateAptIds.includes(myApt.id);
    const shouldShowDynamicEta = onMyWaySent || myIsCurrentlyLate;

    if (myCompleted) {
      // Already completed
      etaText = "Your visit is complete!";
    } else if (practitionerArrived) {
      // Practitioner has marked arrival
      etaMinutes = 0;
      etaText = "Matt has arrived!";
    } else if (!shouldShowDynamicEta) {
      // Not currently delayed and no explicit on-my-way event for this patient.
      // Keep ETA stable at the booked time.
      etaText = "On schedule";
      etaMinutes = null;
    } else if (isNext && myPostcode) {
      // They are next - get live directions with traffic
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originPostcode)}&destination=${encodeURIComponent(myPostcode)}&departure_time=now&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.routes?.[0]?.legs?.[0]) {
        const leg = data.routes[0].legs[0];
        const durationSeconds = leg.duration_in_traffic?.value || leg.duration.value;
        etaMinutes = Math.ceil(durationSeconds / 60);
        etaText = `Matt is on his way! ETA: ~${etaMinutes} minutes`;
      } else {
        etaText = "Matt is on his way to you!";
      }
    } else if (myPostcode) {
      // Not next yet - estimate based on remaining appointments
      let estimatedMinutes = 0;
      for (let i = completedCount; i < myIndex; i++) {
        const apt = dayApts[i];
        estimatedMinutes += apt.duration_minutes || 60;
        estimatedMinutes += 15;
      }
      
      if (dayApts[completedCount]?.postcode && originPostcode) {
        try {
          const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originPostcode)}&destinations=${encodeURIComponent(dayApts[completedCount].postcode)}&key=${GOOGLE_MAPS_API_KEY}`;
          const resp = await fetch(url);
          const data = await resp.json();
          const element = data.rows?.[0]?.elements?.[0];
          if (element?.status === "OK") {
            estimatedMinutes += Math.ceil(element.duration.value / 60);
          }
        } catch { /* ignore */ }
      }

      // Subtract ahead-of-schedule minutes from estimate
      if (aheadOfScheduleMinutes && aheadOfScheduleMinutes > 0) {
        estimatedMinutes = Math.max(0, estimatedMinutes - aheadOfScheduleMinutes);
      }

      etaMinutes = estimatedMinutes;
      etaText = `Estimated arrival in ~${estimatedMinutes} minutes (${visitsBeforeMe} visit${visitsBeforeMe !== 1 ? "s" : ""} before you)`;
    }

    // Build approximate location for map (offset for privacy)
    let approxLat: number | null = null;
    let approxLng: number | null = null;

    if ((originLat == null || originLng == null) && originPostcode) {
      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(originPostcode)}&key=${GOOGLE_MAPS_API_KEY}`;
        const geocodeResp = await fetch(geocodeUrl);
        const geocodeData = await geocodeResp.json();
        const loc = geocodeData.results?.[0]?.geometry?.location;
        if (loc) {
          originLat = Number(loc.lat);
          originLng = Number(loc.lng);
        }
      } catch {
        // ignore geocode errors and fall back to text-only area
      }
    }

    if (originLat != null && originLng != null) {
      const originOffset = deterministicOffset(`${myApt.id}:origin`, 0.008, 0.012);
      approxLat = originLat + originOffset.lat;
      approxLng = originLng + originOffset.lng;
    }

    // Resolve town/suburb from postcode via Google Geocoding API
    async function resolveTown(postcode: string | null): Promise<string | null> {
      if (!postcode) return null;
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(postcode)}&components=country:GB&key=${GOOGLE_MAPS_API_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();
        const components = data.results?.[0]?.address_components;
        if (!components) return null;
        // Prioritise sublocality (village/suburb) over broader locality/postal_town
        for (const pref of ["sublocality_level_1", "sublocality", "locality", "postal_town"]) {
          const match = components.find((c: any) => c.types.includes(pref));
          if (match) return match.long_name;
        }
        // Fallback to the first administrative_area_level_2
        const admin2 = components.find((c: any) => c.types.includes("administrative_area_level_2"));
        if (admin2) return admin2.long_name;
        return null;
      } catch {
        return null;
      }
    }

    // Batch-resolve towns for postcodes that don't have locality stored
    const postcodesNeedingGeocode = [...new Set(
      dayApts.filter((a: any) => a.postcode && !a.locality).map((a: any) => a.postcode)
    )] as string[];
    const townMap: Record<string, string> = {};
    await Promise.all(postcodesNeedingGeocode.map(async (pc) => {
      const town = await resolveTown(pc);
      if (town) townMap[pc] = town;
    }));

    // Build anonymized day appointments for timeline display
    const anonymizedApts = dayApts.map((a: any) => ({
      id: a.id,
      appointment_time: a.appointment_time,
      status: a.status,
      postcode: a.postcode,
      duration_minutes: a.duration_minutes,
      town: a.locality || (a.postcode ? (townMap[a.postcode] || null) : null),
      running_late: runningLateAptIds.includes(a.id),
    }));

    // Use stored delay ETA only while this appointment is currently running late.
    // If no longer late, keep ETA anchored to the booked appointment time.
    const myDayApt = dayApts.find((a: any) => a.id === myApt.id);
    let etaArrivalTime: string | null = null;

    if (myDayApt?.delay_eta_arrival && (myIsCurrentlyLate || onMyWaySent)) {
      // Use stored ETA from either delay notification or on-my-way manual override
      etaArrivalTime = myDayApt.delay_eta_arrival;
      const storedArrival = new Date(myDayApt.delay_eta_arrival);
      const remainingMs = storedArrival.getTime() - Date.now();
      if (remainingMs > 0) {
        etaMinutes = Math.ceil(remainingMs / 60000);
        etaText = `Matt is on his way! ETA: ~${etaMinutes} minutes`;
      } else {
        etaMinutes = 0;
        etaText = "He should be with you any minute!";
      }
    } else if (etaMinutes != null) {
      const arrival = new Date(Date.now() + etaMinutes * 60000);
      etaArrivalTime = arrival.toISOString();
    } else {
      etaArrivalTime = `${myApt.appointment_date}T${myApt.appointment_time}`;
    }

    // Resolve destination coords for patient's location
    let destLat: number | null = myFullApt?.latitude ?? null;
    let destLng: number | null = myFullApt?.longitude ?? null;
    let approxDestLat: number | null = null;
    let approxDestLng: number | null = null;
    if ((destLat == null || destLng == null) && myPostcode) {
      try {
        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(myPostcode)}&key=${GOOGLE_MAPS_API_KEY}`;
        const geoResp = await fetch(geoUrl);
        const geoData = await geoResp.json();
        const loc = geoData.results?.[0]?.geometry?.location;
        if (loc) {
          destLat = Number(loc.lat);
          destLng = Number(loc.lng);
        }
      } catch { /* ignore */ }
    }

    if (destLat != null && destLng != null) {
      const destOffset = deterministicOffset(`${myApt.id}:dest`, 0.005, 0.007);
      approxDestLat = destLat + destOffset.lat;
      approxDestLng = destLng + destOffset.lng;
    }

    // Show full day route to all patients
    const visibleApts = anonymizedApts;

    // Check if this is a come_to_practitioner appointment
    const { data: fullAptData } = await sb.from("appointments")
      .select("come_to_practitioner, ready_from_time")
      .eq("id", myApt.id)
      .single();
    const comeToPractitioner = fullAptData?.come_to_practitioner ?? false;
    const readyFromTime = fullAptData?.ready_from_time ?? null;

    return new Response(JSON.stringify({
      eta_minutes: etaMinutes,
      eta_text: etaText,
      eta_arrival_time: etaArrivalTime,
      is_next: isNext,
      visits_before: visitsBeforeMe,
      completed_count: completedCount,
      total_visits: dayApts.length,
      approx_lat: approxLat,
      approx_lng: approxLng,
      dest_lat: approxDestLat,
      dest_lng: approxDestLng,
      origin_area: originPostcode.split(" ")[0],
      my_completed: dayApts.find((a: any) => a.id === myApt.id)?.status === "completed",
      delay_notified: !!dayApts.find((a: any) => a.id === myApt.id)?.delay_notified_at,
      on_my_way_sent: onMyWaySent,
      practitioner_arrived: practitionerArrived,
      ahead_of_schedule_minutes: aheadOfScheduleMinutes,
      running_late: runningLate,
      come_to_practitioner: comeToPractitioner,
      ready_from_time: readyFromTime,
      my_appointment: {
        id: myApt.id,
        client_name: myApt.client_name,
        appointment_date: myApt.appointment_date,
        appointment_time: myApt.appointment_time,
      },
      day_appointments: visibleApts,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visit-eta error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
