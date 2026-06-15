import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ThresholdResult, DB_HL_STEPS, CLASSIFICATION_BANDS, Classification, Recommendation } from './types';

interface PdfParams {
  patientName: string | null;
  patientDob: string | null;
  patientAge: number | null;
  isGeneralMode: boolean;
  serviceContext: string;
  volumeTarget: number;
  frequencySet: string;
  frequencies: number[];
  roomNoise: string;
  leftResults: ThresholdResult[];
  rightResults: ThresholdResult[];
  leftClassification: Classification;
  rightClassification: Classification;
  recommendation: Recommendation;
  clinicalSummary: string;
  ageContextText: string;
  notes: string;
}

function calculatePTA4(thresholds: ThresholdResult[]): { value: number; freqsUsed: number[] } {
  const speechFreqs = [500, 1000, 2000, 4000];
  const matched = speechFreqs.map(f => thresholds.find(t => t.frequency_hz === f)).filter(Boolean) as ThresholdResult[];
  if (matched.length >= 2) {
    return {
      value: Math.round(matched.reduce((s, t) => s + t.estimated_dbhl, 0) / matched.length),
      freqsUsed: matched.map(t => t.frequency_hz),
    };
  }
  const fallback = thresholds.filter(t => t.frequency_hz >= 250 && t.frequency_hz <= 4000);
  if (fallback.length === 0) return { value: 0, freqsUsed: [] };
  return {
    value: Math.round(fallback.reduce((s, t) => s + t.estimated_dbhl, 0) / fallback.length),
    freqsUsed: fallback.map(t => t.frequency_hz),
  };
}

function classifyPTA(pta: number): string {
  if (pta <= 25) return 'Normal';
  if (pta <= 40) return 'Mild';
  if (pta <= 55) return 'Moderate';
  if (pta <= 70) return 'Moderately Severe';
  if (pta <= 90) return 'Severe';
  return 'Profound';
}

function getHighFreqAvg(thresholds: ThresholdResult[]): number | null {
  const hf = thresholds.filter(t => [3000, 4000, 6000, 8000].includes(t.frequency_hz));
  if (hf.length === 0) return null;
  return hf.reduce((s, t) => s + t.estimated_dbhl, 0) / hf.length;
}

function getLowFreqAvg(thresholds: ThresholdResult[]): number | null {
  const lf = thresholds.filter(t => [250, 500, 750, 1000].includes(t.frequency_hz));
  if (lf.length === 0) return null;
  return lf.reduce((s, t) => s + t.estimated_dbhl, 0) / lf.length;
}

function generateAdvice(leftPta: number, rightPta: number, leftThresholds: ThresholdResult[], rightThresholds: ThresholdResult[]): string[] {
  const worstPta = Math.max(leftPta, rightPta);
  const allThresholds = [...leftThresholds, ...rightThresholds];
  const hfAvg = getHighFreqAvg(allThresholds);
  const lfAvg = getLowFreqAvg(allThresholds);
  const isHighFreqPattern = hfAvg !== null && lfAvg !== null && (hfAvg - lfAvg) >= 15;
  const isLowFreqPattern = hfAvg !== null && lfAvg !== null && (lfAvg - hfAvg) >= 15;
  const advice: string[] = [];

  if (worstPta <= 25) {
    advice.push('Your screening results are within the normal range. You should be able to hear everyday sounds including quiet conversations, the kettle boiling, and your phone ringing without difficulty.');
    return advice;
  }

  if (isHighFreqPattern) {
    advice.push('Your results suggest a high-frequency hearing pattern. You may notice:');
    advice.push('• Speech sounds muffled — consonants like s, f, t, sh may be harder to catch.');
    advice.push('• Conversations in noisy places (restaurants, busy rooms) are more tiring.');
    advice.push('• The TV may need to be louder, or subtitles may help.');
    advice.push('• Quiet high-pitched sounds like birdsong or microwave beeps may be missed.');
  } else if (isLowFreqPattern) {
    advice.push('Your results suggest lower frequencies are more affected:');
    advice.push('• Deeper voices may be harder to follow clearly.');
    advice.push('• Background hum or traffic may mask speech.');
  } else {
    advice.push('Your results suggest a general change in hearing across frequencies.');
  }

  if (worstPta > 25 && worstPta <= 40) {
    advice.push('• Quiet conversations may occasionally be missed, especially from another room.');
    advice.push('• Group conversations may require more concentration.');
  } else if (worstPta > 40 && worstPta <= 55) {
    advice.push('• Phone calls may need speaker or higher volume. Listening fatigue is common.');
  } else if (worstPta > 55) {
    advice.push('• Most conversations may be difficult without support. Check your smoke alarm can be heard.');
  }

  return advice;
}

function generateHearingAidGuidance(leftPta: number, rightPta: number, asymmetry: boolean): string[] {
  const worstPta = Math.max(leftPta, rightPta);
  const lines: string[] = [];
  if (worstPta <= 25) {
    lines.push('Hearing aids usually not needed. If difficulty persists, consider a formal assessment.');
  } else if (worstPta <= 40) {
    lines.push('Some people find hearing aids helpful in noisy environments at this level.');
  } else {
    lines.push('Hearing aids often provide clear benefit. A formal audiology assessment is recommended.');
  }
  if (asymmetry) {
    lines.push('Significant ear difference detected — formal assessment recommended to investigate.');
  }
  lines.push('UK: NHS audiology (via GP referral) or private assessment available.');
  return lines;
}

function drawAudiogramInPdf(doc: jsPDF, startY: number, left: ThresholdResult[], right: ThresholdResult[], freqs: number[]) {
  const x0 = 20, graphW = 170, graphH = 70;
  const dbMin = -10, dbMax = 100;
  const logMin = Math.log2(freqs[0] || 250);
  const logMax = Math.log2(freqs[freqs.length - 1] || 8000);
  const xScale = (f: number) => x0 + ((Math.log2(f) - logMin) / (logMax - logMin)) * graphW;
  const yScale = (db: number) => startY + ((db - dbMin) / (dbMax - dbMin)) * graphH;

  // Classification band colours (very light)
  const bandColors: [number, number, number][] = [
    [34, 197, 94], [234, 179, 8], [249, 115, 22], [239, 68, 68], [220, 38, 38], [127, 29, 29],
  ];

  // White base
  doc.setFillColor(255, 255, 255);
  doc.rect(x0, startY, graphW, graphH, 'F');

  // Shaded bands
  CLASSIFICATION_BANDS.forEach((band, i) => {
    const y1 = yScale(Math.max(band.min, dbMin));
    const y2 = yScale(Math.min(band.max, dbMax));
    const [r, g, b] = bandColors[i] || [200, 200, 200];
    const br = Math.round(255 * 0.92 + r * 0.08);
    const bg = Math.round(255 * 0.92 + g * 0.08);
    const bb = Math.round(255 * 0.92 + b * 0.08);
    doc.setFillColor(br, bg, bb);
    doc.rect(x0, y1, graphW, y2 - y1, 'F');
    doc.setFontSize(5); doc.setTextColor(r, g, b);
    doc.text(band.label, x0 + graphW + 2, (y1 + y2) / 2 + 1.5);
  });

  // Grid
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
  freqs.forEach(f => { const x = xScale(f); doc.line(x, startY, x, startY + graphH); });
  [0, 20, 40, 60, 80, 100].forEach(db => { const yy = yScale(db); doc.line(x0, yy, x0 + graphW, yy); });

  // Axis labels
  doc.setFontSize(6); doc.setTextColor(100);
  freqs.forEach(f => doc.text(f >= 1000 ? `${f / 1000}k` : String(f), xScale(f), startY + graphH + 4, { align: 'center' }));
  [0, 20, 40, 60, 80, 100].forEach(db => doc.text(String(db), x0 - 3, yScale(db) + 1.5, { align: 'right' }));
  doc.setFontSize(7);
  doc.text('Frequency (Hz)', x0 + graphW / 2, startY + graphH + 8, { align: 'center' });

  // Left ear — X markers, blue line
  doc.setDrawColor(59, 130, 246); doc.setLineWidth(0.7);
  if (left.length > 1) {
    for (let i = 0; i < left.length - 1; i++) {
      doc.line(xScale(left[i].frequency_hz), yScale(left[i].estimated_dbhl), xScale(left[i + 1].frequency_hz), yScale(left[i + 1].estimated_dbhl));
    }
  }
  left.forEach(t => {
    const cx = xScale(t.frequency_hz), cy = yScale(t.estimated_dbhl), s = 2;
    doc.line(cx - s, cy - s, cx + s, cy + s); doc.line(cx + s, cy - s, cx - s, cy + s);
    doc.setFontSize(5); doc.setTextColor(59, 130, 246);
    doc.text(String(t.estimated_dbhl), cx + s + 1, cy - 1);
  });

  // Right ear — O markers, red line
  doc.setDrawColor(239, 68, 68); doc.setLineWidth(0.7);
  if (right.length > 1) {
    for (let i = 0; i < right.length - 1; i++) {
      doc.line(xScale(right[i].frequency_hz), yScale(right[i].estimated_dbhl), xScale(right[i + 1].frequency_hz), yScale(right[i + 1].estimated_dbhl));
    }
  }
  right.forEach(t => {
    doc.circle(xScale(t.frequency_hz), yScale(t.estimated_dbhl), 2);
    doc.setFontSize(5); doc.setTextColor(239, 68, 68);
    doc.text(String(t.estimated_dbhl), xScale(t.frequency_hz) + 3, yScale(t.estimated_dbhl) - 1);
  });

  // Legend
  doc.setFontSize(6);
  doc.setTextColor(59, 130, 246); doc.text('X = Left Ear', x0 + graphW - 30, startY + 4);
  doc.setTextColor(239, 68, 68); doc.text('O = Right Ear', x0 + graphW - 30, startY + 8);
  doc.setTextColor(0); doc.setDrawColor(0);
}

export function generateScreeningPdf(params: PdfParams): Blob {
  const {
    patientName, patientDob, patientAge, isGeneralMode, serviceContext,
    volumeTarget, frequencySet, frequencies, roomNoise,
    leftResults, rightResults, leftClassification, rightClassification,
    recommendation, clinicalSummary, ageContextText, notes,
  } = params;

  const doc = new jsPDF();
  let y = 12;

  const pageCheck = (needed = 8) => { if (y > 275 - needed) { doc.addPage(); y = 12; } };
  const addH = (t: string, size = 11) => { pageCheck(10); doc.setFontSize(size); doc.setFont('helvetica', 'bold'); doc.setTextColor(0); doc.text(t, 14, y); y += size === 11 ? 5 : 4.5; };
  const addL = (t: string, indent = 14) => { pageCheck(6); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(50); const lines = doc.splitTextToSize(t, 180 - (indent - 14)); doc.text(lines, indent, y); y += lines.length * 3.8 + 0.5; };
  const addSmall = (t: string) => { pageCheck(5); doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(120); const lines = doc.splitTextToSize(t, 180); doc.text(lines, 14, y); y += lines.length * 3 + 0.5; };

  // === HEADER ===
  const centerX = doc.internal.pageSize.getWidth() / 2;
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  const shawW = doc.getTextWidth('Shaw');
  const scopeW = doc.getTextWidth('Scope');
  const totalW = shawW + scopeW;
  doc.setTextColor(14, 20, 32);
  doc.text('Shaw', centerX - totalW / 2, y);
  doc.setTextColor(212, 145, 42);
  doc.text('Scope', centerX - totalW / 2 + shawW, y);
  doc.setTextColor(0); y += 6;
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(120);
  doc.text('A Home Visiting Service', centerX, y, { align: 'center' });
  doc.setTextColor(0); y += 4;
  doc.setDrawColor(212, 145, 42); doc.setLineWidth(0.5); doc.line(14, y, 196, y); y += 5;
  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
  doc.text('Hearing Screening Report', centerX, y, { align: 'center' }); y += 6;

  // Patient info - compact two-column
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
  const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');
  doc.text(`Date: ${dateStr}`, 14, y);
  if (patientName) doc.text(`Patient: ${patientName}`, 110, y);
  y += 4;
  if (patientDob) { doc.text(`DOB: ${format(new Date(patientDob), 'dd/MM/yyyy')}`, 14, y); }
  if (patientAge !== null) doc.text(`Age: ${patientAge}`, 60, y);
  doc.text(`Method: ShawScope Digital Screening`, 110, y);
  y += 4;
  doc.text(`Headphones: Sennheiser HD 300 Pro (wired) | Vol: ${volumeTarget}%`, 14, y);
  doc.text(`Frequencies: ${frequencySet === 'advanced' ? 'Advanced' : 'Standard'}`, 110, y);
  y += 5;

  // === AUDIOGRAM ===
  addH('Audiogram — Screening Estimate');
  y += 1;
  drawAudiogramInPdf(doc, y, leftResults, rightResults, frequencies);
  y += 82;

  // === PTA4 SUMMARY — compact ===
  const leftPta = calculatePTA4(leftResults);
  const rightPta = calculatePTA4(rightResults);
  const asymmetry = Math.abs(leftPta.value - rightPta.value) >= 15;

  addH('Results Summary');
  // Two column layout
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(59, 130, 246);
  doc.text(`Left Ear: ${leftPta.value} dB HL [${classifyPTA(leftPta.value)}]`, 14, y);
  doc.setTextColor(239, 68, 68);
  doc.text(`Right Ear: ${rightPta.value} dB HL [${classifyPTA(rightPta.value)}]`, 110, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7); doc.setTextColor(100);
  doc.text(`Frequencies: ${leftPta.freqsUsed.join(', ')} Hz`, 14, y);
  doc.text(`Frequencies: ${rightPta.freqsUsed.join(', ')} Hz`, 110, y);
  y += 3.5;
  addSmall('Lower numbers = softer sounds heard. Higher numbers = sounds need to be louder.');

  if (asymmetry) {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(220, 50, 50);
    doc.text('⚠ Significant asymmetry (≥15 dB difference) — further assessment recommended.', 14, y);
    doc.setTextColor(0); y += 5;
  }
  y += 2;

  // === THRESHOLD TABLE — compact inline ===
  addH('Threshold Values', 9);
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(59, 130, 246);
  doc.text('Left (X): ' + leftResults.map(t => `${t.frequency_hz}Hz=${t.estimated_dbhl}dB`).join(', '), 14, y);
  y += 3.5;
  doc.setTextColor(239, 68, 68);
  doc.text('Right (O): ' + rightResults.map(t => `${t.frequency_hz}Hz=${t.estimated_dbhl}dB`).join(', '), 14, y);
  doc.setTextColor(0);
  y += 5;

  // === WHAT YOU MAY NOTICE ===
  pageCheck(20);
  addH('What You May Notice Day-to-Day');
  const advice = generateAdvice(leftPta.value, rightPta.value, leftResults, rightResults);
  advice.forEach(line => addL(line));
  y += 2;

  // === HEARING AID GUIDANCE ===
  pageCheck(15);
  addH('Would Hearing Aids Help?');
  const aidGuidance = generateHearingAidGuidance(leftPta.value, rightPta.value, asymmetry);
  aidGuidance.forEach(line => addL(line));
  y += 2;

  // === CLINICAL SUMMARY ===
  if (clinicalSummary) {
    pageCheck(10);
    addH('Clinical Summary', 9);
    addL(clinicalSummary);
    if (ageContextText) addL(`Age context: ${ageContextText}`);
  }

  // === NOTES ===
  if (notes.trim()) {
    pageCheck(8);
    addH('Additional Notes', 9);
    addL(notes.trim());
  }

  // === DISCLAIMER ===
  pageCheck(12);
  y += 1;
  doc.setDrawColor(200); doc.setLineWidth(0.3); doc.line(14, y, 196, y); y += 3;
  doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(120);
  const disclaimer = 'SCREENING ESTIMATE — NOT A CALIBRATED DIAGNOSTIC AUDIOGRAM. This hearing screening provides an estimate and does not replace a full diagnostic hearing assessment performed by an audiologist. Results should be interpreted alongside symptoms and clinical findings. In the UK, formal hearing assessment is available via NHS audiology (GP referral) or privately.';
  const dLines = doc.splitTextToSize(disclaimer, 180);
  doc.text(dLines, 14, y);

  return doc.output('blob');
}
