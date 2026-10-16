import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Button = forwardRef(function Button(
  {
    children,
    className,
    variant = "primary",
    size = "default",
    type = "button",
    disabled = false,
    ...props
  },
  ref
) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-base-bg,#0C0A09)] disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer";

  const variants = {
    primary:
      "bg-[#FAFAFA] text-[#0A0A0A] font-semibold hover:bg-[#E4E4E7] active:scale-[0.98] shadow-sm",
    secondary:
      "bg-[rgba(255,255,255,0.04)] text-[#FAFAFA] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] active:scale-[0.98] backdrop-blur-md",
    outline:
      "bg-transparent text-[#FAFAFA] border border-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.20)] hover:bg-[rgba(255,255,255,0.04)] active:scale-[0.98]",
    danger:
      "bg-[rgba(232,139,139,0.12)] text-[#E88B8B] border border-[rgba(232,139,139,0.25)] hover:bg-[#E88B8B] hover:text-[#0A0A0A] active:scale-[0.98]",
    ghost:
      "bg-transparent text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.05)] active:scale-[0.98]",
  };

  const sizes = {
    default: "min-h-[44px] px-4 py-2.5 text-sm gap-2",
    sm: "min-h-[44px] px-3 py-2 text-xs gap-1.5",
    lg: "min-h-[48px] px-6 py-3 text-base gap-2.5",
    icon: "min-h-[44px] min-w-[44px] p-2.5",
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
