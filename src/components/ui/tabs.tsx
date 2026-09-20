import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";
export const Tabs = TabsPrimitive.Root;
export const TabsList = ({
  className,
  ...p
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    className={cn(
      "inline-flex h-10 items-center rounded-lg border border-slate-800 bg-slate-950/60 p-1",
      className,
    )}
    {...p}
  />
);
export const TabsTrigger = ({
  className,
  ...p
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn(
      "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-slate-400 data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-300",
      className,
    )}
    {...p}
  />
);
export const TabsContent = TabsPrimitive.Content;
