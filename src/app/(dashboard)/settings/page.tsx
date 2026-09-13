import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">הגדרות</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">פרטי חשבון</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">שם מלא</Label>
            <Input defaultValue="עדן כהן" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">אימייל</Label>
            <Input defaultValue="edencohen533@gmail.com" dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">שם ה-workspace</Label>
            <Input defaultValue="workspace ראשי" />
          </div>
          <Button size="sm">שמור שינויים</Button>
        </CardContent>
      </Card>
      <Card className="opacity-70">
        <CardHeader><CardTitle className="text-base">חיוב וניהול משתמשים</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          ניהול הרשאות צוות, תפקידים וחיוב חודשי יתווספו בשלב הבא של המוצר.
        </CardContent>
      </Card>
    </div>
  );
}
