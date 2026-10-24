"use client";
import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/app/(auth)/actions";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@/lib/permissions";
import { initials } from "@/lib/utils";

export function UserMenu({ name, email, role }: { name: string; email: string | null; role: Role }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40" aria-label="Menu do usuário">
        <Avatar>
          <AvatarFallback>{initials(name || email || "?")}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="truncate">{name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{email}</p>
          <p className="text-xs font-normal text-primary">{ROLE_LABELS[role]}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/auth/nova-senha">
            <KeyRound /> Alterar senha
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem destructive onSelect={() => void signOut()}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
