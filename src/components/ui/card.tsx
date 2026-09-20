import * as React from "react";
import { cn } from "../../lib/utils";
export const Card = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-xl border border-slate-800 bg-slate-950/60 shadow-xl shadow-black/10",
      className,
    )}
    {...p}
  />
);
export const CardHeader = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-row items-center justify-between space-y-0 p-5 pb-3",
      className,
    )}
    {...p}
  />
);
export const CardTitle = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-sm font-semibold tracking-wide", className)} {...p} />
);
export const CardContent = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-5 pt-2", className)} {...p} />
);
