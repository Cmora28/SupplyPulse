"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "@/i18n/client";
import { MessageSquare, Send } from "lucide-react";

export default function SupportPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }

      toast({
        title: t("support.success"),
        description: t("support.successDesc"),
      });
      setSubject("");
      setMessage("");
    } catch (err) {
      toast({
        title: t("support.failed"),
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("support.title")}</h1>
        <p className="text-muted-foreground">{t("support.subtitle")}</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("support.formTitle")}
          </CardTitle>
          <CardDescription>{t("support.formDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">{t("support.subjectLabel")}</Label>
              <Input
                id="subject"
                placeholder={t("support.subjectPlaceholder")}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">{t("support.messageLabel")}</Label>
              <Textarea
                id="message"
                placeholder={t("support.messagePlaceholder")}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={5000}
                rows={6}
                required
              />
              <p className="text-xs text-muted-foreground text-right">
                {message.length}/5000
              </p>
            </div>
            <Button type="submit" disabled={sending || !subject.trim() || !message.trim()}>
              {sending ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("support.sending")}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t("support.send")}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
