import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Activity, Plus, Trash2, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";

export interface NEWSObservation {
  timestamp: string;
  respirationRate: string;
  spo2: string;
  airOrOxygen: "air" | "oxygen";
  systolicBP: string;
  diastolicBP: string;
  pulse: string;
  consciousness: "alert" | "cvpu";
  temperature: string;
  score: number;
  gpReferred: boolean;
}

// NEWS2 scoring functions
function scoreRespirationRate(val: number): number {
  if (val <= 8) return 3;
  if (val <= 11) return 1;
  if (val <= 20) return 0;
  if (val <= 24) return 2;
  return 3;
}

function scoreSpO2Scale1(val: number): number {
  if (val <= 91) return 3;
  if (val <= 93) return 2;
  if (val <= 95) return 1;
  return 0;
}

function scoreAirOxygen(val: "air" | "oxygen"): number {
  return val === "oxygen" ? 2 : 0;
}

function scoreSystolicBP(val: number): number {
  if (val <= 90) return 3;
  if (val <= 100) return 2;
  if (val <= 110) return 1;
  if (val <= 219) return 0;
  return 3;
}

function scorePulse(val: number): number {
  if (val <= 40) return 3;
  if (val <= 50) return 1;
  if (val <= 90) return 0;
  if (val <= 110) return 1;
  if (val <= 130) return 2;
  return 3;
}

function scoreConsciousness(val: "alert" | "cvpu"): number {
  return val === "cvpu" ? 3 : 0;
}

function scoreTemperature(val: number): number {
  if (val <= 35.0) return 3;
  if (val <= 36.0) return 1;
  if (val <= 38.0) return 0;
  if (val <= 39.0) return 1;
  return 2;
}

function calculateNEWSScore(obs: Partial<NEWSObservation>): number {
  let total = 0;
  const rr = parseFloat(obs.respirationRate || "");
  const sp = parseFloat(obs.spo2 || "");
  const bp = parseFloat(obs.systolicBP || "");
  const hr = parseFloat(obs.pulse || "");
  const temp = parseFloat(obs.temperature || "");

  if (!isNaN(rr)) total += scoreRespirationRate(rr);
  if (!isNaN(sp)) total += scoreSpO2Scale1(sp);
  total += scoreAirOxygen(obs.airOrOxygen || "air");
  if (!isNaN(bp)) total += scoreSystolicBP(bp);
  if (!isNaN(hr)) total += scorePulse(hr);
  total += scoreConsciousness(obs.consciousness || "alert");
  if (!isNaN(temp)) total += scoreTemperature(temp);

  return total;
}

function getScoreColor(score: number): string {
  if (score <= 4) return "text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/30 dark:border-green-800";
  if (score <= 6) return "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800";
  return "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/30 dark:border-red-800";
}

function getScoreLabel(score: number): string {
  if (score === 0) return "Low risk";
  if (score <= 4) return "Low risk";
  if (score <= 6) return "Medium risk — consider clinical response";
  return "High risk — urgent clinical response required";
}

interface NEWSScorePanelProps {
  observations: NEWSObservation[];
  onChange: (observations: NEWSObservation[]) => void;
  readOnly?: boolean;
}

const emptyObservation = (): NEWSObservation => ({
  timestamp: new Date().toISOString(),
  respirationRate: "",
  spo2: "",
  airOrOxygen: "air",
  systolicBP: "",
  diastolicBP: "",
  pulse: "",
  consciousness: "alert",
  temperature: "",
  score: 0,
  gpReferred: false,
});

export default function NEWSScorePanel({ observations, onChange, readOnly }: NEWSScorePanelProps) {
  const [expanded, setExpanded] = useState(observations.length > 0);

  const addObservation = () => {
    onChange([...observations, emptyObservation()]);
    setExpanded(true);
  };

  const removeObservation = (index: number) => {
    onChange(observations.filter((_, i) => i !== index));
  };

  const updateObservation = useCallback((index: number, field: keyof NEWSObservation, value: any) => {
    const updated = observations.map((obs, i) => {
      if (i !== index) return obs;
      const newObs = { ...obs, [field]: value };
      newObs.score = calculateNEWSScore(newObs);
      return newObs;
    });
    onChange(updated);
  }, [observations, onChange]);

  const hasAnyScore = observations.some(o => o.score > 0);
  const highestScore = observations.reduce((max, o) => Math.max(max, o.score), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-secondary" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Clinical Observations (NEWS2)</h3>
        </div>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addObservation} className="w-full sm:w-auto">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Observations
          </Button>
        )}
      </div>

      {observations.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No clinical observations recorded.{!readOnly && ' Click "Add Observations" to begin.'}</p>
      )}

      {observations.map((obs, index) => {
        const score = obs.score;
        const scoreColorClass = getScoreColor(score);
        const needsGPReferral = score >= 5;
        const hasAnyValue = obs.respirationRate || obs.spo2 || obs.systolicBP || obs.pulse || obs.temperature;
        const bpDisplay = obs.systolicBP && obs.diastolicBP ? `${obs.systolicBP}/${obs.diastolicBP}` : obs.systolicBP || "";

        return (
          <div key={index} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Observation {index + 1} — {format(new Date(obs.timestamp), "dd/MM/yyyy HH:mm")}
              </div>
              {!readOnly && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeObservation(index)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>

            {readOnly ? (
              /* Read-only compact display */
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {obs.respirationRate && (
                  <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
                    <p className="text-[10px] text-muted-foreground">RR</p>
                    <p className="text-sm font-medium">{obs.respirationRate} /min</p>
                  </div>
                )}
                {obs.spo2 && (
                  <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
                    <p className="text-[10px] text-muted-foreground">SpO₂</p>
                    <p className="text-sm font-medium">{obs.spo2}%</p>
                  </div>
                )}
                {(obs.systolicBP || obs.diastolicBP) && (
                  <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
                    <p className="text-[10px] text-muted-foreground">BP</p>
                    <p className="text-sm font-medium">{bpDisplay} mmHg</p>
                  </div>
                )}
                {obs.pulse && (
                  <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
                    <p className="text-[10px] text-muted-foreground">Pulse</p>
                    <p className="text-sm font-medium">{obs.pulse} bpm</p>
                  </div>
                )}
                {obs.temperature && (
                  <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
                    <p className="text-[10px] text-muted-foreground">Temp</p>
                    <p className="text-sm font-medium">{obs.temperature}°C</p>
                  </div>
                )}
                <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
                  <p className="text-[10px] text-muted-foreground">O₂</p>
                  <p className="text-sm font-medium">{obs.airOrOxygen === "oxygen" ? "Supplemental" : "Room Air"}</p>
                </div>
                <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
                  <p className="text-[10px] text-muted-foreground">ACVPU</p>
                  <p className="text-sm font-medium">{obs.consciousness === "alert" ? "Alert" : "CVPU"}</p>
                </div>
              </div>
            ) : (
              /* Editable inputs */
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Respiration Rate (breaths/min)</Label>
                  <Input
                    type="number"
                    value={obs.respirationRate}
                    onChange={(e) => updateObservation(index, "respirationRate", e.target.value)}
                    placeholder="12-20 normal"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SpO₂ (%)</Label>
                  <Input
                    type="number"
                    value={obs.spo2}
                    onChange={(e) => updateObservation(index, "spo2", e.target.value)}
                    placeholder="96-100 normal"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Air or Oxygen</Label>
                  <Select value={obs.airOrOxygen} onValueChange={(v) => updateObservation(index, "airOrOxygen", v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="air">Room Air</SelectItem>
                      <SelectItem value="oxygen">Supplemental O₂</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Systolic BP (mmHg)</Label>
                  <Input
                    type="number"
                    value={obs.systolicBP}
                    onChange={(e) => updateObservation(index, "systolicBP", e.target.value)}
                    placeholder="111-219 normal"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Diastolic BP (mmHg)</Label>
                  <Input
                    type="number"
                    value={obs.diastolicBP || ""}
                    onChange={(e) => updateObservation(index, "diastolicBP", e.target.value)}
                    placeholder="60-80 normal"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pulse (bpm)</Label>
                  <Input
                    type="number"
                    value={obs.pulse}
                    onChange={(e) => updateObservation(index, "pulse", e.target.value)}
                    placeholder="51-90 normal"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Consciousness</Label>
                  <Select value={obs.consciousness} onValueChange={(v) => updateObservation(index, "consciousness", v as "alert" | "cvpu")}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alert">Alert</SelectItem>
                      <SelectItem value="cvpu">CVPU (Confusion/Voice/Pain/Unresponsive)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <Label className="text-xs">Temperature (°C)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={obs.temperature}
                    onChange={(e) => updateObservation(index, "temperature", e.target.value)}
                    placeholder="36.1-38.0 normal"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Score display */}
            {hasAnyValue && (
              <div className={`rounded-lg border p-3 ${scoreColorClass}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{score}</span>
                    <span className="text-xs font-medium">/21</span>
                  </div>
                  <span className="text-xs font-medium">{getScoreLabel(score)}</span>
                </div>
              </div>
            )}

            {/* GP referral checkbox - shown when score >= 5 */}
            {needsGPReferral && hasAnyValue && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                    Elevated NEWS2 score — clinical escalation recommended
                  </p>
                </div>
                {readOnly ? (
                  obs.gpReferred && (
                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">✓ Patient advised to contact GP / 111 / A&E</p>
                  )
                ) : (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={obs.gpReferred}
                      onCheckedChange={(c) => updateObservation(index, "gpReferred", !!c)}
                    />
                    <Label className="font-normal text-xs text-red-700 dark:text-red-300">
                      I have recommended the patient contact their GP / call 111 / attend A&E as appropriate
                    </Label>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { calculateNEWSScore, getScoreLabel, getScoreColor };
