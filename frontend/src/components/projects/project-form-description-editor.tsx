"use client";

import * as React from "react";
import { Editor } from "@tinymce/tinymce-react";
import type { Editor as TinyMceEditorType } from "tinymce";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const TINYMCE_VERSION = "7.6.1";
const TINYMCE_SCRIPT = `https://cdn.jsdelivr.net/npm/tinymce@${TINYMCE_VERSION}/tinymce.min.js`;

export interface ProjectFormDescriptionEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ProjectFormDescriptionEditor({
  value,
  onChange,
  disabled,
  placeholder = "Describe the project",
  className,
}: ProjectFormDescriptionEditorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const init = React.useMemo(
    () => ({
      height: 220,
      min_height: 180,
      menubar: false,
      statusbar: false,
      branding: false,
      promotion: false,
      resize: true,
      skin: isDark ? "oxide-dark" : "oxide",
      content_css: isDark ? "dark" : "default",
      plugins: "lists link autolink code",
      toolbar:
        "undo redo | blocks | bold italic underline strikethrough | bullist numlist | link unlink | removeformat | code",
      block_formats: "Paragraph=p; Heading 2=h2; Heading 3=h3",
      placeholder,
      link_default_target: "_blank",
      link_rel_list: [
        { title: "No referrer", value: "noreferrer noopener" },
        { title: "No follow", value: "nofollow" },
      ],
      content_style:
        "body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; font-size: 14px; line-height: 1.6; margin: 10px 12px; }",
      setup(_editor: TinyMceEditorType) {},
    }),
    [isDark, placeholder]
  );

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden ring-1 ring-black/[0.06] dark:ring-white/10",
        className
      )}
    >
      <Editor
        tinymceScriptSrc={TINYMCE_SCRIPT}
        licenseKey="gpl"
        disabled={disabled}
        value={value}
        onEditorChange={(content) => onChange(content)}
        init={init}
      />
    </div>
  );
}
