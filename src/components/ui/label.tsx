import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "../../lib/utils";
export const Label=({className,...props}:React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>)=><LabelPrimitive.Root className={cn("text-xs font-medium text-slate-400",className)} {...props}/>;
