"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Columns3, Users, Settings } from "lucide-react";

export type ProjectTabValue = "overview" | "board" | "members" | "settings";

export interface ProjectTabsProps {
  value: ProjectTabValue;
  onValueChange: (value: ProjectTabValue) => void;
  className?: string;
}

const TABS: { value: ProjectTabValue; label: string; icon: typeof LayoutDashboard }[] = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "board", label: "Board", icon: Columns3 },
  { value: "members", label: "Members", icon: Users },
  { value: "settings", label: "Settings", icon: Settings },
];

export function ProjectTabs({ value, onValueChange, className }: ProjectTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as ProjectTabValue)} className={cn("w-full", className)}>
      <TabsList className="w-full justify-start flex flex-wrap h-auto gap-1 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
              <Icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
