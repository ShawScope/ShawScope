import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, MapPin, Loader2, Flame, Users, Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface Appointment {
  id: string;
  client_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  price: number | null;
  travel_fee: number | null;
  travel_distance_miles: number | null;
  address: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

interface PatientPin {
  id: string;
  client_name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface PostcodeAnalysis {
  area: string;
  count: number;
  revenue: number;
}

interface AreasMapSectionProps {
  appointments: Appointment[];
  filteredApts: Appointment[];
  postcodeAnalysis: PostcodeAnalysis[];
  totalDistance: number;
  totalTravelFees: number;
  confirmedApts: Appointment[];
  periodLabel: string;
  exportPDF: (type: string) => void;
  reportYear: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

const AreasMapSection = ({
  appointments,
  filteredApts,
  postcodeAnalysis,
  totalDistance,
  totalTravelFees,
  confirmedApts,
  periodLabel,
  exportPDF,
  reportYear,
}: AreasMapSectionProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const heatmapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapFilter, setMapFilter] = useState<string>(reportYear);
  const [mapMonthFilter, setMapMonthFilter] = useState<string>("all");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showPatients, setShowPatients] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [deletedPins, setDeletedPins] = useState<Set<string>>(new Set());
  const [patientPins, setPatientPins] = useState<PatientPin[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch Google Maps API key
  useEffect(() => {
    const fetchKey = async () => {
      try {
        const { data } = await supabase.functions.invoke("google-maps-key");
        if (data?.apiKey) setApiKey(data.apiKey);
      } catch (e) {
        console.error("Failed to fetch maps key", e);
      }
    };
    fetchKey();
  }, []);

  // Fetch patient locations
  useEffect(() => {
    const fetchPatients = async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, client_name, address, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .not("address", "is", null);
      if (data) {
        setPatientPins(data.map(p => ({
          id: p.id,
          client_name: p.client_name,
          address: p.address!,
          latitude: p.latitude!,
          longitude: p.longitude!,
        })));
      }
    };
    fetchPatients();
  }, [geocoding]); // refetch after geocoding

  // Get appointments with coordinates filtered by year and month, excluding deleted pins
  const mappableApts = useMemo(() => {
    return appointments.filter(a => {
      if (!a.latitude || !a.longitude) return false;
      if (deletedPins.has(a.id)) return false;
      const date = parseISO(a.appointment_date);
      if (mapFilter !== "all") {
        if (date.getFullYear() !== parseInt(mapFilter)) return false;
      }
      if (mapMonthFilter !== "all") {
        if (date.getMonth() !== parseInt(mapMonthFilter)) return false;
      }
      return true;
    });
  }, [appointments, mapFilter, mapMonthFilter, deletedPins]);

  // Local overrides for appointment edits (address/coords) so map doesn't revert on re-render
  const [aptOverrides, setAptOverrides] = useState<Record<string, Partial<Appointment>>>({});

  // Delete pin — clears coordinates from the appointment
  const deletePin = async (aptId: string) => {
    setDeletedPins(prev => new Set(prev).add(aptId));
    const { error } = await supabase
      .from("appointments")
      .update({ latitude: null, longitude: null })
      .eq("id", aptId);
    if (error) {
      toast.error("Failed to remove pin");
      setDeletedPins(prev => { const n = new Set(prev); n.delete(aptId); return n; });
    } else {
      toast.success("Pin removed");
    }
  };

  // Apply overrides to mappable appointments
  const effectiveApts = useMemo(() => {
    return mappableApts.map(a => aptOverrides[a.id] ? { ...a, ...aptOverrides[a.id] } : a);
  }, [mappableApts, aptOverrides]);

  // Load Google Maps script with visualization library for heatmap
  useEffect(() => {
    if (!apiKey) return;
    if ((window as any).google?.maps?.Map && (window as any).google?.maps?.visualization) {
      setMapLoaded(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      if (!existingScript.getAttribute("src")?.includes("visualization")) {
        existingScript.remove();
      } else {
        const checkLoaded = setInterval(() => {
          if ((window as any).google?.maps?.Map) {
            setMapLoaded(true);
            clearInterval(checkLoaded);
          }
        }, 200);
        return () => clearInterval(checkLoaded);
      }
    }

    const script = document.createElement("script");
    // Pin to v=3.64 — HeatmapLayer was removed in v3.65 (Feb 2026).
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,visualization&v=3.64`;
    script.async = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, [apiKey]);

  // Initialize map and add markers
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const G = (window as any).google;
    if (!googleMapRef.current) {
      googleMapRef.current = new G.maps.Map(mapRef.current, {
        center: { lat: 50.7154, lng: -2.4373 },
        zoom: 10,
        mapTypeId: "roadmap",
      });

      // Resize the map whenever the container becomes visible or changes size
      // (fixes black/blank map on mobile when the Areas tab is activated after
      // having been mounted while hidden inside a Tabs component).
      try {
        const ro = new ResizeObserver(() => {
          const G2 = (window as any).google;
          if (G2 && googleMapRef.current && mapRef.current && mapRef.current.offsetWidth > 0) {
            const center = googleMapRef.current.getCenter();
            G2.maps.event.trigger(googleMapRef.current, "resize");
            if (center) googleMapRef.current.setCenter(center);
          }
        });
        ro.observe(mapRef.current);
        (googleMapRef.current as any).__ro = ro;
      } catch { /* no-op */ }
    }

    // Clear existing markers
    markersRef.current.forEach((m: any) => m.setMap(null));
    markersRef.current = [];

    // Clear existing heatmap
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
      heatmapRef.current = null;
    }

    const bounds = new G.maps.LatLngBounds();
    const heatmapData: any[] = [];
    let hasPoints = false;

    // Add appointment markers
    effectiveApts.forEach(apt => {
      const pos = { lat: apt.latitude!, lng: apt.longitude! };
      bounds.extend(pos);
      heatmapData.push(new G.maps.LatLng(apt.latitude!, apt.longitude!));
      hasPoints = true;

      let dateStr = "—";
      try {
        if (apt.appointment_date) {
          const d = parseISO(apt.appointment_date);
          if (!isNaN(d.getTime())) dateStr = format(d, "dd/MM/yyyy");
        }
      } catch { /* keep fallback */ }
      const statusColor = apt.status === "completed" ? "#22c55e" :
        apt.status === "confirmed" || apt.status === "approved" ? "#3b82f6" :
        apt.status === "cancelled" ? "#ef4444" : "#f59e0b";

      const marker = new G.maps.Marker({
        position: pos,
        map: showHeatmap ? null : googleMapRef.current,
        icon: {
          path: G.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: statusColor,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        title: `${apt.client_name} — ${dateStr}`,
      });

      const deleteBtnId = `delete-pin-${apt.id}`;
      const editAddrId = `edit-addr-${apt.id}`;
      const addrInputId = `addr-input-${apt.id}`;
      const saveAddrId = `save-addr-${apt.id}`;
      const movePinId = `move-pin-${apt.id}`;
      const escapedAddr = (apt.address || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

      const info = new G.maps.InfoWindow({
        content: `<div style="color:#1e293b;font-size:13px;max-width:280px;">
          <strong>${apt.client_name}</strong><br/>
          <span style="color:#64748b;">${dateStr} at ${apt.appointment_time?.slice(0,5)}</span><br/>
          <div id="${editAddrId}" style="margin-top:4px;">
            ${apt.address ? `<span style="color:#64748b;font-size:11px;">${apt.address}</span>` : `<span style="color:#94a3b8;font-size:11px;font-style:italic;">No address</span>`}
            <button style="margin-left:4px;font-size:10px;color:#3b82f6;background:none;border:none;cursor:pointer;text-decoration:underline;">✏️ edit</button>
          </div>
          <div id="${addrInputId}" style="display:none;margin-top:4px;">
            <input type="text" value="${escapedAddr}" style="width:100%;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;color:#1e293b;" placeholder="Enter address..." />
            <div style="display:flex;gap:4px;margin-top:4px;">
              <button id="${saveAddrId}" style="flex:1;padding:3px 8px;border:none;border-radius:4px;font-size:11px;color:white;background:#3b82f6;cursor:pointer;">💾 Save & re-plot</button>
            </div>
          </div>
          <span style="display:inline-block;margin-top:4px;padding:2px 6px;border-radius:4px;font-size:11px;background:${statusColor};color:white;">${apt.status}</span>
          <div style="display:flex;gap:4px;margin-top:6px;">
            <button id="${movePinId}" style="flex:1;padding:3px 8px;border:1px solid #3b82f6;border-radius:4px;font-size:11px;color:#3b82f6;background:white;cursor:pointer;">📍 Move pin</button>
            <button id="${deleteBtnId}" style="flex:1;padding:3px 8px;border:1px solid #ef4444;border-radius:4px;font-size:11px;color:#ef4444;background:white;cursor:pointer;">🗑 Remove</button>
          </div>
        </div>`,
      });

      info.addListener("domready", () => {
        // Delete pin
        const delBtn = document.getElementById(deleteBtnId);
        if (delBtn) delBtn.onclick = () => { info.close(); deletePin(apt.id); };

        // Toggle edit address
        const editDiv = document.getElementById(editAddrId);
        const inputDiv = document.getElementById(addrInputId);
        if (editDiv && inputDiv) {
          editDiv.onclick = () => {
            editDiv.style.display = "none";
            inputDiv.style.display = "block";
            const inp = inputDiv.querySelector("input");
            if (inp) inp.focus();
          };
        }

        // Save address & re-geocode
        const saveBtn = document.getElementById(saveAddrId);
        if (saveBtn && inputDiv) {
          saveBtn.onclick = async () => {
            const inp = inputDiv.querySelector("input") as HTMLInputElement | null;
            const newAddr = inp?.value?.trim();
            if (!newAddr) return;
            saveBtn.textContent = "⏳ Saving...";
            saveBtn.setAttribute("disabled", "true");
            // Update address in DB and local state
            await supabase.from("appointments").update({ address: newAddr }).eq("id", apt.id);
            setAptOverrides(prev => ({ ...prev, [apt.id]: { ...prev[apt.id], address: newAddr } }));
            // Re-geocode
            if (apiKey) {
              try {
                const resp = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(newAddr + ", UK")}&key=${apiKey}`);
                const geo = await resp.json();
                if (geo.results?.[0]) {
                  const loc = geo.results[0].geometry.location;
                  await supabase.from("appointments").update({ latitude: loc.lat, longitude: loc.lng }).eq("id", apt.id);
                  setAptOverrides(prev => ({ ...prev, [apt.id]: { ...prev[apt.id], latitude: loc.lat, longitude: loc.lng } }));
                  marker.setPosition({ lat: loc.lat, lng: loc.lng });
                }
              } catch { /* ignore geocode failure */ }
            }
            info.close();
            toast.success("Address updated & saved");
          };
        }

        // Move pin — make draggable
        const moveBtn = document.getElementById(movePinId);
        if (moveBtn) {
          moveBtn.onclick = () => {
            marker.setDraggable(true);
            marker.setIcon({
              path: G.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: "#3b82f6",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            });
            info.close();
            toast.info("Drag the pin to its correct location, then click it to save");

            const dragListener = G.maps.event.addListenerOnce(marker, "dragend", async () => {
              const newPos = marker.getPosition();
              if (newPos) {
                await supabase.from("appointments").update({ latitude: newPos.lat(), longitude: newPos.lng() }).eq("id", apt.id);
                setAptOverrides(prev => ({ ...prev, [apt.id]: { ...prev[apt.id], latitude: newPos.lat(), longitude: newPos.lng() } }));
                toast.success("Pin location saved");
              }
              marker.setDraggable(false);
              marker.setIcon({
                path: G.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: statusColor,
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              });
            });
          };
        }
      });

      marker.addListener("click", () => {
        info.open({ anchor: marker, map: googleMapRef.current });
      });

      markersRef.current.push(marker);
    });

    // Add patient markers (purple diamond shape)
    if (showPatients) {
      patientPins.forEach(patient => {
        const pos = { lat: patient.latitude, lng: patient.longitude };
        bounds.extend(pos);
        heatmapData.push(new G.maps.LatLng(patient.latitude, patient.longitude));
        hasPoints = true;

        const marker = new G.maps.Marker({
          position: pos,
          map: showHeatmap ? null : googleMapRef.current,
          icon: {
            path: "M 0,-8 L 5,0 L 0,8 L -5,0 Z",
            scale: 1.2,
            fillColor: "#a855f7",
            fillOpacity: 0.85,
            strokeColor: "#ffffff",
            strokeWeight: 1.5,
          },
          title: patient.client_name,
        });

        const editAddrId = `edit-paddr-${patient.id}`;
        const addrInputId = `paddr-input-${patient.id}`;
        const saveAddrId = `save-paddr-${patient.id}`;
        const movePinId = `move-ppin-${patient.id}`;
        const deletePinId = `delete-ppin-${patient.id}`;
        const escapedAddr = (patient.address || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

        const info = new G.maps.InfoWindow({
          content: `<div style="color:#1e293b;font-size:13px;max-width:280px;">
            <strong>📋 ${patient.client_name}</strong><br/>
            <div id="${editAddrId}" style="margin-top:4px;">
              <span style="color:#64748b;font-size:11px;">${patient.address}</span>
              <button style="margin-left:4px;font-size:10px;color:#a855f7;background:none;border:none;cursor:pointer;text-decoration:underline;">✏️ edit</button>
            </div>
            <div id="${addrInputId}" style="display:none;margin-top:4px;">
              <input type="text" value="${escapedAddr}" style="width:100%;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;color:#1e293b;" placeholder="Enter address..." />
              <div style="display:flex;gap:4px;margin-top:4px;">
                <button id="${saveAddrId}" style="flex:1;padding:3px 8px;border:none;border-radius:4px;font-size:11px;color:white;background:#a855f7;cursor:pointer;">💾 Save & re-plot</button>
              </div>
            </div>
            <span style="display:inline-block;margin-top:4px;padding:2px 6px;border-radius:4px;font-size:11px;background:#a855f7;color:white;">Patient Record</span>
            <div style="display:flex;gap:4px;margin-top:6px;">
              <button id="${movePinId}" style="flex:1;padding:3px 8px;border:1px solid #a855f7;border-radius:4px;font-size:11px;color:#a855f7;background:white;cursor:pointer;">📍 Move pin</button>
              <button id="${deletePinId}" style="flex:1;padding:3px 8px;border:1px solid #ef4444;border-radius:4px;font-size:11px;color:#ef4444;background:white;cursor:pointer;">🗑 Remove</button>
            </div>
          </div>`,
        });

        info.addListener("domready", () => {
          // Delete patient pin
          const delBtn = document.getElementById(deletePinId);
          if (delBtn) {
            delBtn.onclick = async () => {
              info.close();
              marker.setMap(null);
              const { error } = await supabase.from("patients").update({ latitude: null, longitude: null }).eq("id", patient.id);
              if (error) { toast.error("Failed to remove pin"); }
              else { toast.success("Patient pin removed"); }
            };
          }
          // Toggle edit address
          const editDiv = document.getElementById(editAddrId);
          const inputDiv = document.getElementById(addrInputId);
          if (editDiv && inputDiv) {
            editDiv.onclick = () => {
              editDiv.style.display = "none";
              inputDiv.style.display = "block";
              const inp = inputDiv.querySelector("input");
              if (inp) (inp as HTMLInputElement).focus();
            };
          }

          // Save address & re-geocode
          const saveBtn = document.getElementById(saveAddrId);
          if (saveBtn && inputDiv) {
            saveBtn.onclick = async () => {
              const inp = inputDiv.querySelector("input") as HTMLInputElement | null;
              const newAddr = inp?.value?.trim();
              if (!newAddr) return;
              saveBtn.textContent = "⏳ Saving...";
              saveBtn.setAttribute("disabled", "true");
              await supabase.from("patients").update({ address: newAddr }).eq("id", patient.id);
              let newLat = patient.latitude, newLng = patient.longitude;
              if (apiKey) {
                try {
                  const resp = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(newAddr + ", UK")}&key=${apiKey}`);
                  const geo = await resp.json();
                  if (geo.results?.[0]) {
                    const loc = geo.results[0].geometry.location;
                    await supabase.from("patients").update({ latitude: loc.lat, longitude: loc.lng }).eq("id", patient.id);
                    marker.setPosition({ lat: loc.lat, lng: loc.lng });
                    newLat = loc.lat; newLng = loc.lng;
                  }
                } catch { /* ignore geocode failure */ }
              }
              setPatientPins(prev => prev.map(p => p.id === patient.id ? { ...p, address: newAddr, latitude: newLat, longitude: newLng } : p));
              info.close();
              toast.success("Patient address updated & saved");
            };
          }

          // Move pin
          const moveBtn = document.getElementById(movePinId);
          if (moveBtn) {
            moveBtn.onclick = () => {
              marker.setDraggable(true);
              marker.setIcon({
                path: "M 0,-8 L 5,0 L 0,8 L -5,0 Z",
                scale: 1.5,
                fillColor: "#a855f7",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 3,
              });
              info.close();
              toast.info("Drag the pin to its correct location");

              G.maps.event.addListenerOnce(marker, "dragend", async () => {
                const newPos = marker.getPosition();
                if (newPos) {
                  await supabase.from("patients").update({ latitude: newPos.lat(), longitude: newPos.lng() }).eq("id", patient.id);
                  setPatientPins(prev => prev.map(p => p.id === patient.id ? { ...p, latitude: newPos.lat(), longitude: newPos.lng() } : p));
                  toast.success("Patient pin location saved");
                }
                marker.setDraggable(false);
                marker.setIcon({
                  path: "M 0,-8 L 5,0 L 0,8 L -5,0 Z",
                  scale: 1.2,
                  fillColor: "#a855f7",
                  fillOpacity: 0.85,
                  strokeColor: "#ffffff",
                  strokeWeight: 1.5,
                });
              });
            };
          }
        });

        marker.addListener("click", () => {
          info.open({ anchor: marker, map: googleMapRef.current });
        });

        markersRef.current.push(marker);
      });
    }

    // Create heatmap layer (gracefully skip if the API removed HeatmapLayer)
    if (G.maps.visualization?.HeatmapLayer && heatmapData.length > 0) {
      try {
        heatmapRef.current = new G.maps.visualization.HeatmapLayer({
          data: heatmapData,
          map: showHeatmap ? googleMapRef.current : null,
          radius: 30,
          opacity: 0.7,
          gradient: [
          "rgba(0, 255, 255, 0)",
          "rgba(0, 255, 255, 1)",
          "rgba(0, 191, 255, 1)",
          "rgba(0, 127, 255, 1)",
          "rgba(0, 63, 255, 1)",
          "rgba(0, 0, 255, 1)",
          "rgba(0, 0, 223, 1)",
          "rgba(0, 0, 191, 1)",
          "rgba(0, 0, 159, 1)",
          "rgba(63, 0, 159, 1)",
          "rgba(127, 0, 159, 1)",
          "rgba(191, 0, 159, 1)",
          "rgba(255, 0, 0, 1)",
          ],
        });
      } catch (e) {
        console.warn("HeatmapLayer unavailable, skipping heatmap:", e);
        heatmapRef.current = null;
      }
    }

    if (hasPoints) {
      if (effectiveApts.length + (showPatients ? patientPins.length : 0) > 1) {
        googleMapRef.current.fitBounds(bounds, 50);
      } else {
        googleMapRef.current.setCenter(bounds.getCenter());
        googleMapRef.current.setZoom(14);
      }
    }
  }, [mapLoaded, effectiveApts, showHeatmap, showPatients, patientPins]);

  // Toggle heatmap/markers visibility
  useEffect(() => {
    if (!mapLoaded) return;
    markersRef.current.forEach(m => m.setMap(showHeatmap ? null : googleMapRef.current));
    if (heatmapRef.current) {
      heatmapRef.current.setMap(showHeatmap ? googleMapRef.current : null);
    }
  }, [showHeatmap, mapLoaded]);

  // Geocode missing coordinates
  const handleGeocode = async () => {
    setGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke("batch-geocode");
      if (error) throw error;
      const aptCount = data.geocoded || 0;
      const patCount = data.patientGeocoded || 0;
      toast.success(`Geocoded ${aptCount} appointments + ${patCount} patients`);
      if (aptCount > 0 || patCount > 0) {
        window.location.reload();
      }
    } catch (e) {
      toast.error("Failed to geocode addresses");
      console.error(e);
    } finally {
      setGeocoding(false);
    }
  };

  const unmappedCount = useMemo(() => {
    const unmappedApts = appointments.filter(a => !a.latitude && !a.longitude && a.address).length;
    const unmappedPatients = patientPins.length === 0 ? 188 : 0; // approximate — will be accurate after first load
    return unmappedApts + unmappedPatients;
  }, [appointments, patientPins]);

  // Count patients without coords for the button
  const [unmappedPatientCount, setUnmappedPatientCount] = useState(0);
  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .is("latitude", null)
        .not("address", "is", null);
      setUnmappedPatientCount(count || 0);
    };
    fetchCount();
  }, [geocoding]);

  const totalUnmapped = useMemo(() => {
    const unmappedApts = appointments.filter(a => !a.latitude && !a.longitude && a.address).length;
    return unmappedApts + unmappedPatientCount;
  }, [appointments, unmappedPatientCount]);

  return (
    <div className="space-y-4">
      {/* Map */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-400" />
            <CardTitle className="text-sm font-medium text-white">Appointment & Patient Map</CardTitle>
            <Badge variant="outline" className="border-border text-muted-foreground text-xs">
              {mappableApts.length} appts
            </Badge>
            {showPatients && (
              <Badge variant="outline" className="border-purple-600 text-purple-300 text-xs">
                {patientPins.length} patients
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Patient toggle */}
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-purple-400" />
              <Label htmlFor="patients-toggle" className="text-xs text-muted-foreground cursor-pointer">Patients</Label>
              <Switch
                id="patients-toggle"
                checked={showPatients}
                onCheckedChange={setShowPatients}
                className="scale-75"
              />
            </div>
            {/* Heatmap toggle */}
            <div className="flex items-center gap-2">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              <Label htmlFor="heatmap-toggle" className="text-xs text-muted-foreground cursor-pointer">Heatmap</Label>
              <Switch
                id="heatmap-toggle"
                checked={showHeatmap}
                onCheckedChange={setShowHeatmap}
                className="scale-75"
              />
            </div>
            {/* Year filter */}
            <Select value={mapFilter} onValueChange={(v) => { setMapFilter(v); if (v === "all") setMapMonthFilter("all"); }}>
              <SelectTrigger className="w-[100px] h-8 text-xs bg-muted/60 border-border text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                {YEARS.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Month filter */}
            <Select value={mapMonthFilter} onValueChange={setMapMonthFilter} disabled={mapFilter === "all"}>
              <SelectTrigger className="w-[100px] h-8 text-xs bg-muted/60 border-border text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Geocode button */}
            {totalUnmapped > 0 && (
              <Button size="sm" variant="outline" onClick={handleGeocode} disabled={geocoding} className="h-8 text-xs">
                {geocoding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <MapPin className="h-3 w-3 mr-1" />}
                Plot {totalUnmapped} missing
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!apiKey ? (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading map...
            </div>
          ) : (
            <div className={isFullscreen ? "fixed inset-0 z-50 bg-card" : "relative"}>
              <div ref={mapRef} className={`w-full rounded-lg border border-border ${isFullscreen ? "h-full rounded-none border-0" : "h-[400px]"}`} />
              {/* Zoom controls */}
              <div className="absolute top-3 right-3 flex flex-col gap-1">
                <Button size="sm" variant="secondary" className="h-8 w-8 p-0 shadow-md" onClick={() => { setIsFullscreen(f => !f); setTimeout(() => { const G = (window as any).google; if (G && googleMapRef.current) G.maps.event.trigger(googleMapRef.current, "resize"); }, 100); }} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="secondary" className="h-8 w-8 p-0 shadow-md" onClick={() => googleMapRef.current?.setZoom((googleMapRef.current?.getZoom() || 10) + 1)} title="Zoom in">
                  +
                </Button>
                <Button size="sm" variant="secondary" className="h-8 w-8 p-0 shadow-md" onClick={() => googleMapRef.current?.setZoom((googleMapRef.current?.getZoom() || 10) - 1)} title="Zoom out">
                  −
                </Button>
                <Button size="sm" variant="secondary" className="h-8 w-8 p-0 shadow-md text-[10px]" onClick={() => googleMapRef.current?.setZoom(6)} title="Zoom all the way out">
                  UK
                </Button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Completed</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Confirmed</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Pending</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Cancelled</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rotate-45 bg-purple-500 inline-block" style={{ width: 10, height: 10 }} /> Patient</span>
          </div>
        </CardContent>
      </Card>

      {/* Postcode Table */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-white">Appointments by Postcode Area — {periodLabel}</CardTitle>
          <Button size="sm" variant="outline" onClick={() => exportPDF("Area Analysis")}>
            <FileDown className="h-4 w-4 mr-1" /> Export PDF
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Postcode Area</TableHead>
                <TableHead className="text-right text-muted-foreground">Appointments</TableHead>
                <TableHead className="text-right text-muted-foreground">Revenue</TableHead>
                <TableHead className="text-right text-muted-foreground">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {postcodeAnalysis.map((p, i) => (
                <TableRow key={i} className="border-border hover:bg-muted/30">
                  <TableCell className="font-medium text-white">{p.area}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{p.count}</TableCell>
                  <TableCell className="text-right text-muted-foreground">£{p.revenue.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{filteredApts.length ? ((p.count / filteredApts.length) * 100).toFixed(1) : 0}%</TableCell>
                </TableRow>
              ))}
              {postcodeAnalysis.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No postcode data available</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Travel Summary */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm font-medium text-white">Travel Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Miles</p>
              <p className="text-2xl font-bold text-white">{totalDistance.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg. Miles/Appt</p>
              <p className="text-2xl font-bold text-white">{confirmedApts.length ? (totalDistance / confirmedApts.length).toFixed(1) : 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Travel Fees</p>
              <p className="text-2xl font-bold text-white">£{totalTravelFees.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AreasMapSection;
