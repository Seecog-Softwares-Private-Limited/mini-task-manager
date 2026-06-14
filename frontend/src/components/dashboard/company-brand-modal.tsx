"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { updateOrganization } from "@/services/api/organizations.api";
import { LogoCropModal } from "@/components/workspaces/logo-crop-modal";
import { WorkspaceThumb } from "@/components/workspaces/workspace-thumb";
import { parseApiError } from "@/services/api/client";
import {
  useCompanyFontSize,
  FONT_SIZE_OPTIONS,
  type FontSizeOption,
} from "@/hooks/use-company-font-size";
import type { Organization } from "@/types/api";
import { cn } from "@/lib/utils";

interface CompanyBrandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: Organization;
}

export function CompanyBrandModal({ open, onOpenChange, org }: CompanyBrandModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(org.name);
  const [logoPreview, setLogoPreview] = useState<string | null>(org.logoUrl ?? null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const { fontSize, option: activeFontOption, setFontSize } = useCompanyFontSize(org.id);
  const [localFontSize, setLocalFontSize] = useState<FontSizeOption>(fontSize);

  // Sync state when org changes or modal opens
  useEffect(() => {
    if (open) {
      setName(org.name);
      setLogoPreview(org.logoUrl ?? null);
      setLocalFontSize(fontSize);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, org.name, org.logoUrl]);

  const previewOption = FONT_SIZE_OPTIONS.find((o) => o.value === localFontSize) ?? FONT_SIZE_OPTIONS[2];

  const hasChanges =
    name.trim() !== org.name ||
    (logoPreview ?? "") !== (org.logoUrl ?? "") ||
    localFontSize !== fontSize;

  const mutation = useMutation({
    mutationFn: () => {
      const payload: { name?: string; logoUrl?: string } = {};
      if (name.trim() !== org.name) payload.name = name.trim();
      const before = org.logoUrl ?? "";
      const after = logoPreview ?? "";
      if (before !== after) payload.logoUrl = after;
      return updateOrganization(org.id, payload);
    },
    onSuccess: () => {
      // Persist font size to localStorage
      if (localFontSize !== fontSize) setFontSize(localFontSize);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization", org.id] });
      onOpenChange(false);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setCropSrc(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // If only font size changed (no API call needed), save directly
  function handleSave() {
    const apiPayload: { name?: string; logoUrl?: string } = {};
    if (name.trim() !== org.name) apiPayload.name = name.trim();
    const before = org.logoUrl ?? "";
    const after = logoPreview ?? "";
    if (before !== after) apiPayload.logoUrl = after;

    if (Object.keys(apiPayload).length === 0) {
      // Only font size changed — no API call needed
      if (localFontSize !== fontSize) setFontSize(localFontSize);
      onOpenChange(false);
    } else {
      mutation.mutate();
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Company branding</DialogTitle>
            <DialogDescription>
              Update your company logo, name and font size. All workspace members will see these.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Logo upload */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Company logo
              </Label>
              <div className="flex items-center gap-4">
                <div
                  className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to upload logo"
                >
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                        <ImagePlus className="h-5 w-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <WorkspaceThumb
                      workspace={{ ...org, logoUrl: undefined }}
                      size="md"
                      className="h-full w-full rounded-none text-lg gradient-bg text-white"
                    />
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    {logoPreview ? "Change logo" : "Upload logo"}
                  </Button>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                      onClick={() => setLogoPreview(null)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove logo
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground/70">
                    PNG, JPG, SVG. Shown in sidebar &amp; workspace cards.
                  </p>
                </div>
              </div>
            </div>

            {/* Company name */}
            <div className="space-y-2">
              <Label htmlFor="company-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Company name
              </Label>
              <Input
                id="company-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Inc."
                maxLength={150}
              />
            </div>

            {/* Font size */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Company name font size
              </Label>
              <div className="flex items-center gap-2">
                {FONT_SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLocalFontSize(opt.value)}
                    className={cn(
                      "flex h-9 flex-1 flex-col items-center justify-center rounded-lg border text-center transition-all",
                      localFontSize === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    <span style={{ fontSize: opt.px }} className="font-semibold leading-none">
                      A
                    </span>
                    <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Live preview */}
              <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-2.5">
                {logoPreview ? (
                  <img src={logoPreview} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                ) : (
                  <WorkspaceThumb
                    workspace={{ ...org, logoUrl: undefined }}
                    size="sm"
                    className="h-8 w-8 shrink-0 rounded-lg gradient-bg text-white text-[10px]"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                    Company
                  </p>
                  <p
                    className="truncate font-semibold leading-tight tracking-tight text-foreground"
                    style={{ fontSize: previewOption.px }}
                  >
                    {name || org.name}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground/70">
                Preview of how the company name appears in the sidebar.
              </p>
            </div>
          </div>

          {mutation.error && (
            <p className="text-xs text-destructive">{parseApiError(mutation.error)}</p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || !name.trim() || mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LogoCropModal
        open={!!cropSrc}
        imageSrc={cropSrc ?? ""}
        onConfirm={(cropped) => {
          setLogoPreview(cropped);
          setCropSrc(null);
        }}
        onCancel={() => setCropSrc(null)}
      />
    </>
  );
}
