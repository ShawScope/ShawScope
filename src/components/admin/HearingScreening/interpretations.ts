import { Classification, Recommendation } from './types';

export function getPatientFriendlySummary(
  leftClass: Classification,
  rightClass: Classification,
  recommendation: Recommendation,
  patientAge: number | null
): string {
  const parts: string[] = [];

  parts.push("## What This May Mean For You\n");

  const describeEar = (ear: string, c: Classification) => {
    switch (c) {
      case 'normal':
        return `Your ${ear} ear screening results fall within the normal range. This suggests you are likely hearing everyday sounds well, including quiet conversations, the kettle boiling, and your phone ringing.`;
      case 'mild':
        return `Your ${ear} ear screening results suggest a mild change in hearing. You may occasionally find it harder to follow quiet conversations, hear a washing machine finishing its cycle, or catch the doorbell from another room. This is often manageable but worth monitoring.`;
      case 'moderate':
        return `Your ${ear} ear screening results suggest a moderate change in hearing. You may find it more difficult to follow conversations without raising the TV volume, hear someone calling from another room, or clearly catch phone calls. A referral to audiology may be beneficial.`;
      case 'moderately_severe':
        return `Your ${ear} ear screening results suggest a moderately severe change in hearing. You may struggle to hear normal conversation, need the TV at a higher volume, or miss traffic sounds and doorbells. A professional hearing assessment is recommended.`;
      case 'severe':
        return `Your ${ear} ear screening results suggest a significant change in hearing. You may find it very difficult to hear most everyday sounds, including conversations, the telephone, and important safety sounds like smoke alarms. A prompt referral for professional assessment is advised.`;
      case 'profound':
        return `Your ${ear} ear screening results suggest a profound change in hearing. Most everyday sounds, including loud conversations and safety alerts, may be very difficult to hear. An urgent referral for specialist assessment is strongly recommended.`;
      case 'inconclusive':
        return `Your ${ear} ear screening results were inconclusive. This may be due to background noise or difficulty with the test. A retest in a quieter environment may be helpful.`;
    }
  };

  parts.push(describeEar('left', leftClass));
  parts.push('');
  parts.push(describeEar('right', rightClass));
  parts.push('');

  // Age context
  if (patientAge !== null) {
    parts.push('### Age Context');
    if (patientAge < 40) {
      parts.push("Noticeable hearing changes are less common at this age. Further assessment may be advisable if symptomatic.");
    } else if (patientAge <= 60) {
      parts.push("Mild to moderate high-frequency changes can become more common in this age group.");
    } else {
      parts.push("Age-related hearing changes are common and often affect higher frequencies first.");
    }
    parts.push('');
  }

  parts.push("---");
  parts.push("*This is a screening estimate and does not replace a formal audiology test.*");

  return parts.join('\n');
}

export function getClinicalSummary(
  leftClass: Classification,
  rightClass: Classification,
  recommendation: Recommendation,
  roomNoise: string,
  falsePositiveRateLeft: number,
  falsePositiveRateRight: number
): string {
  const reliability = (falsePositiveRateLeft <= 0.2 && falsePositiveRateRight <= 0.2)
    ? 'good' : 'limited';

  const recLabels: Record<Recommendation, string> = {
    reassure: 'Reassure — no further action indicated',
    retest: 'Retest recommended',
    refer_audiology: 'Refer to audiology for formal assessment',
    urgent_gp_ent: 'Urgent GP/ENT referral recommended',
  };

  const classLabels: Record<Classification, string> = {
    normal: 'Normal hearing',
    mild: 'Mild hearing loss',
    moderate: 'Moderate hearing loss',
    moderately_severe: 'Moderately severe hearing loss',
    severe: 'Severe hearing loss',
    profound: 'Profound hearing loss',
    inconclusive: 'Inconclusive',
  };

  return `Digital hearing screening performed in clinic using Sennheiser HD 300 Pro closed-back circumaural headphones (wired 3.5 mm), fixed volume protocol, device placed in Do Not Disturb mode. Environmental noise check: ${roomNoise}. Screening estimate indicates ${classLabels[leftClass]} left ear and ${classLabels[rightClass]} right ear. Response reliability: ${reliability}. Recommendation: ${recLabels[recommendation]}.`;
}

export function getAgeContextText(age: number | null): string {
  if (age === null) return '';
  if (age < 40) return "Noticeable hearing changes are less common at this age. Further assessment may be advisable if symptomatic.";
  if (age <= 60) return "Mild to moderate high-frequency changes can become more common in this age group.";
  return "Age-related hearing changes are common and often affect higher frequencies first.";
}
