import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Textarea } from '../../components/ui/input';
import { apiClient } from '../../lib/api-client';
import { Terminal, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import type { ImportCandidate } from '../../types/api';

export const ImportAnnouncementPage: React.FC = () => {
  const [rawText, setRawText] = useState(
    `FREE FIRE SCULL TOURNAMENT
Date: 29th October 2026
Registration Deadline: 29 Oct 6:00 PM IST
Check in Time: 7:30 PM
Match Starts: 8:00 PM IST
Map: Bermuda, Purgatory
Format: Squad Battle Royale`
  );

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportCandidate | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    try {
      setIsLoading(false);
      setErrorMsg(null);
      setIsLoading(true);
      const res = await apiClient<ImportCandidate>('/imports/announcement', {
        method: 'POST',
        body: {
          text: rawText,
          organizer_timezone: 'Asia/Kolkata',
        },
        requiresAuth: true,
      });
      setResult(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to parse text announcement.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-8">
      <div>
        <div className="font-mono text-xs uppercase tracking-widest text-editorial-green font-semibold mb-1">
          Source Integration & AI Parser
        </div>
        <h1 className="font-heading font-bold text-3xl sm:text-4xl text-editorial-charcoal tracking-tight">
          Announcement Text Parser
        </h1>
        <p className="text-xs sm:text-sm text-editorial-muted mt-1 max-w-xl">
          Paste tournament announcements from Discord or WhatsApp. The backend's pure parser extracts dates, deadlines, and maps without ever fabricating unconfirmed times.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input text */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="w-4 h-4 text-editorial-charcoal" />
                Raw Announcement Text
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleParse} className="flex flex-col gap-4">
                <Textarea
                  label="Pasted Discord / Social Announcement"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={10}
                  className="font-mono text-xs leading-relaxed"
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Run Pure Parser Engine
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Parsed output */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Parser Verification Output</CardTitle>
                <p className="text-xs text-editorial-muted">Evaluated by Fastify announcement parser service</p>
              </div>
              {result && (
                <span
                  className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                    result.needs_review
                      ? 'bg-editorial-orange-light text-editorial-orange border-[#F6CEB4]'
                      : 'bg-editorial-green-light text-editorial-green border-[#BFE0D2]'
                  }`}
                >
                  {result.needs_review ? 'Needs Review' : 'Verified Extraction'}
                </span>
              )}
            </CardHeader>
            <CardContent>
              {errorMsg && (
                <div className="p-3 bg-editorial-orange-light border border-[#F6CEB4] rounded text-xs text-editorial-orange">
                  {errorMsg}
                </div>
              )}

              {result ? (
                <div className="flex flex-col gap-4">
                  {/* Candidate object */}
                  <div className="bg-editorial-ivory border border-editorial-border rounded p-4">
                    <span className="font-mono text-[10px] uppercase text-editorial-muted block mb-2 font-bold">
                      Extracted Candidate Fields:
                    </span>
                    <pre className="font-mono text-xs text-editorial-charcoal overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(result.candidate, null, 2)}
                    </pre>
                  </div>

                  {/* Ambiguities */}
                  {result.ambiguities?.length > 0 && (
                    <div className="p-3 bg-editorial-orange-light border border-[#F6CEB4] rounded text-xs flex flex-col gap-1">
                      <span className="font-bold text-editorial-orange flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        Ambiguities Flagged:
                      </span>
                      <ul className="list-disc pl-5 font-mono text-[11px] text-editorial-charcoal">
                        {result.ambiguities.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Errors */}
                  {result.errors?.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      <span className="font-bold block mb-1">Extraction Errors:</span>
                      <ul className="list-disc pl-5 font-mono text-[11px]">
                        {result.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-xs text-editorial-muted">
                  <p>Click "Run Pure Parser Engine" to evaluate pasted text against backend date and time regexes.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
