'use client';

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Plus,
  Search,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import NotifDropdown from "@/components/notifikasi/NotifDropdown";
import Button from "@/components/ui/Button";
import SpecularButton from "@/components/ui/SpecularButton";
import { useSession, signOut } from "@/lib/auth-client";
import { toast } from "@/lib/use-toast";

export default function Navbar({
  onOpenAddTask,
  overdueTasks = [],
  todayTasks = [],
  upcomingTasks = [],
  categories = [],
  onMarkDone,
}) {
  const router = useRouter();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Ambil data sesi pengguna dari Better Auth
  const { data: session } = useSession();
  const currentUser = session?.user;
  const displayName = currentUser?.name || "";
  const displayEmail = currentUser?.email || "";
  const avatarUrl = currentUser?.image;
  const userInitial = (displayName || "U").charAt(0).toUpperCase();

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    }
    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  // Close user menu or mobile search overlay on Escape key press
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (isMobileSearchOpen) {
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          setIsMobileSearchOpen(false);
        }
        if (isUserMenuOpen) {
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          setIsUserMenuOpen(false);
        }
      }
    }

    if (isMobileSearchOpen || isUserMenuOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileSearchOpen, isUserMenuOpen]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/tugas?cari=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      router.push("/tugas");
    }
    setIsMobileSearchOpen(false);
  }

  async function handleLogout() {
    setIsUserMenuOpen(false);
    try {
      await signOut();
      toast.info("Anda telah keluar dari akun.");
    } catch (e) {
      console.error("Logout error", e);
    }
    router.push("/login");
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 min-h-[64px] bg-[var(--theme-nav-bg,rgba(16,12,10,0.75))] backdrop-blur-[20px] backdrop-saturate-[130%] border-b border-[var(--glass-border,rgba(255,255,255,0.08))] shadow-[0_4px_24px_rgba(0,0,0,0.35)] pt-[env(safe-area-inset-top,0px)]">
      {/* Mobile Search Overlay Bar */}
      {isMobileSearchOpen ? (
        <div className="h-16 px-4 flex items-center gap-3 sm:hidden animate-in fade-in duration-150">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari tugas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="w-full min-h-[44px] pl-9 pr-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.16)] focus:border-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#FAFAFA]/40 text-base text-[#FAFAFA] placeholder:text-zinc-400"
            />
          </form>
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(false)}
            aria-label="Tutup pencarian"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            <ChevronDown className="w-5 h-5 rotate-90" />
          </button>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA] rounded-lg p-1"
            >
              <div className="w-8 h-8 rounded-lg bg-[#FAFAFA] text-[#0A0A0A] flex items-center justify-center font-bold shadow-sm">
                <CheckSquare className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="font-heading text-base sm:text-lg font-bold text-[#FAFAFA] tracking-tight">
                MyTask
              </span>
            </Link>
          </div>

          {/* Center: Desktop / Tablet Search Form */}
          <div className="hidden sm:block flex-1 max-w-md mx-3 sm:mx-6">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari tugas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] focus:border-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#FAFAFA]/40 focus:bg-[rgba(255,255,255,0.04)] text-base sm:text-sm text-[#FAFAFA] placeholder:text-zinc-400 transition-all duration-200"
              />
            </form>
          </div>

          {/* Right: Search Toggle (Mobile), Add Task, Notifications & User Avatar */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile Search Icon Trigger (collapse on mobile) */}
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(true)}
              aria-label="Cari tugas"
              className="sm:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-zinc-300 hover:text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Add Task Button (Specular Glass Highlight) */}
            <SpecularButton
              size="sm"
              onClick={onOpenAddTask}
              className="shadow-sm min-h-[44px] min-w-[44px]"
              aria-label="Tambah tugas baru"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Tambah Tugas</span>
            </SpecularButton>

            {/* Notifications Dropdown */}
            <NotifDropdown
              overdueTasks={overdueTasks}
              todayTasks={todayTasks}
              upcomingTasks={upcomingTasks}
              categories={categories}
              onMarkDone={onMarkDone}
            />

          {/* User Profile Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              aria-label="Menu pengguna"
              aria-expanded={isUserMenuOpen}
              className="min-h-[44px] inline-flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] border border-transparent hover:border-[rgba(255,255,255,0.08)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA]"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover border border-white/20 shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.14)] text-[#FAFAFA] text-xs font-bold flex items-center justify-center">
                  {userInitial}
                </div>
              )}
              <span className="text-xs font-medium text-[#FAFAFA] hidden lg:inline-block">
                {displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#71717A] hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[var(--theme-nav-bg,#1A130E)] backdrop-blur-[20px] backdrop-saturate-[130%] border border-[var(--glass-border-hover,rgba(255,255,255,0.12))] shadow-2xl z-50 p-1.5 space-y-1 animate-in fade-in duration-150">
                <div className="px-3 py-2 border-b border-[rgba(255,255,255,0.08)]">
                  <p className="text-xs font-semibold text-[#FAFAFA] truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-[#71717A] truncate">
                    {displayEmail}
                  </p>
                </div>

                <Link
                  href="/pengaturan"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2.5 w-full min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.06)] transition-all duration-200"
                >
                  <Settings className="w-4 h-4" />
                  Pengaturan
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium text-[#E88B8B] hover:bg-[rgba(232,139,139,0.12)] transition-all duration-200 text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </header>
  );
}
