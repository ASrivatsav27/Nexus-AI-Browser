import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> & {
  label: string;
  children: ReactNode;
  size?: "sm" | "md";
  active?: boolean;
};

/** Icon-only control; always carries an accessible name and tooltip. */
export function IconButton({ label, children, size = "md", active, className = "", type = "button", ...rest }: Props) {
  return <button type={type} className={`icon-button ${size} ${active ? "is-active" : ""} ${className}`} aria-label={label} title={label} {...rest}>{children}</button>;
}
