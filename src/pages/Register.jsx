import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, Lock } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { safeReturnTo } from "@/lib/authReturnTo";

// This app is invite-only — admins grant access from the Admin panel.
// Public self-registration is intentionally disabled.
export default function Register() {
  return (
    <AuthLayout
      icon={Lock}
      title="Invite-only access"
      subtitle="New accounts can only be created by an administrator."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to={"/login" + (safeReturnTo() !== "/" ? "?returnTo=" + encodeURIComponent(safeReturnTo()) : "")}
            className="text-primary font-medium hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <div className="flex flex-col items-center text-center gap-4 py-4">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <Mail className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground max-w-xs">
          To get access, ask an administrator to invite your email from the <span className="font-semibold text-foreground">Admin → Users</span> panel. You'll receive an invitation link to set up your account.
        </p>
        <Button
          variant="outline"
          className="w-full h-12 font-medium"
          onClick={() => { window.location.href = "/login" + (safeReturnTo() !== "/" ? "?returnTo=" + encodeURIComponent(safeReturnTo()) : ""); }}
        >
          Go to login
        </Button>
      </div>
    </AuthLayout>
  );
}