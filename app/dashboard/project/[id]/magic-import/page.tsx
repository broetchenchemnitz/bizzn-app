"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function MagicImportPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleImport = async () => {
    if (!input.trim()) {
      toast.error("Bitte gib zuerst den Text deiner Speisekarte ein.");
      return;
    }

    setIsLoading(true);
    setStatus("idle");

    try {
      const response = await fetch("/api/ai/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: input,
          projectId: projectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import fehlgeschlagen");
      }

      setStatus("success");
      toast.success("Daten erfolgreich extrahiert und gespeichert!");

      // Kurze Verzögerung für das visuelle Feedback, dann Redirect
      setTimeout(() => {
        router.push(`/dashboard/project/${projectId}/menu`);
        router.refresh();
      }, 1500);
    } catch (error: any) {
      console.error("Import Error:", error);
      setStatus("error");
      toast.error(error.message || "Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/project/${projectId}/menu`}>
          <Button variant="ghost" size="icon" className="hover:bg-[#242424]">
            <ArrowLeft className="w-5 h-5 text-[#C7A17A]" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Magic Import</h1>
      </div>

      <Card className="bg-[#242424] border-[#C7A17A]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#C7A17A]">
            <Sparkles className="w-5 h-5" />
            KI-Speisekarten Extraktion
          </CardTitle>
          <CardDescription className="text-gray-400">
            Kopiere den Text deiner Speisekarte (oder OCR-Rohdaten) hier hinein.
            Unsere KI erkennt Kategorien, Namen, Beschreibungen und Preise automatisch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Beispiel: Pizza Margherita - Tomaten, Mozzarella, Basilikum ... 8.50€"
            className="min-h-[300px] bg-[#1A1A1A] border-[#C7A17A]/10 text-white focus:border-[#C7A17A] focus:ring-[#C7A17A]/20 transition-all"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleImport}
              disabled={isLoading || !input.trim()}
              className="w-full bg-[#C7A17A] hover:bg-[#B58E62] text-[#1A1A1A] font-bold py-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Magie passiert gerade...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Import starten
                </>
              )}
            </Button>

            {status === "success" && (
              <div className="flex items-center gap-2 text-green-500 bg-green-500/10 p-3 rounded-md border border-green-500/20">
                <CheckCircle2 className="w-5 h-5" />
                <span>Import erfolgreich! Du wirst gleich weitergeleitet...</span>
              </div>
            )}

            {status === "error" && (
              <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-md border border-red-500/20">
                <AlertCircle className="w-5 h-5" />
                <span>Fehler beim Import. Bitte versuche es erneut.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
