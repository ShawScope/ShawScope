import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme, type Theme } from "@/hooks/useTheme";
import { Sun, Moon, Monitor, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <Palette className="h-4 w-4" /> Appearance
        </CardTitle>
        <CardDescription>Choose how the admin interface looks. System follows your device setting.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 max-w-md">
          {OPTIONS.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              type="button"
              variant={theme === value ? "default" : "outline"}
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 h-20",
                theme === value && "ring-2 ring-primary"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Changes apply instantly and are saved to this device. Note: dark mode is the original design — light mode is being progressively refined across all admin tabs.
        </p>
      </CardContent>
    </Card>
  );
}
