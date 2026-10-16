import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Input = forwardRef(function Input(
  {
    label,
    error,
    helper,
    icon: Icon,
    className,
    id,
    type = "text",
    ...props
  },
  ref
) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          id={id}
          type={type}
          className={cn(
            "w-full min-h-[44px] px-3.5 py-2.5 rounded-lg text-base sm:text-sm text-[#FAFAFA] placeholder:text-zinc-400 transition-all duration-200",
            "bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)]",
            "focus:border-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#FAFAFA]/40 focus:bg-[rgba(255,255,255,0.04)]",
            error && "border-[#E88B8B] focus:border-[#E88B8B] focus:ring-[#E88B8B]/40",
            Icon && "pl-10",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-[#E88B8B] font-medium">{error}</p>}
      {!error && helper && <p className="text-xs text-zinc-400">{helper}</p>}
    </div>
  );
});

export default Input;
