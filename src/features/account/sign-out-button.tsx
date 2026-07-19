"use client";

import { AlertDialog, Button } from "@heroui/react";
import { LogOut } from "lucide-react";

/**
 * Signing out drops unsaved work and sends the writer back to the login page,
 * so it always asks first. The confirmation is a HeroUI AlertDialog: focus
 * trapping, scroll lock, and an inert background come from React Aria rather
 * than being hand-rolled per call site.
 */
export function SignOutButton({
  variant = "outline",
  fullWidth,
}: {
  variant?: "outline" | "ghost";
  fullWidth?: boolean;
}) {
  return (
    <AlertDialog>
      {/* Button is the trigger directly: wrapping it in `AlertDialog.Trigger`
          nests a second `role="button"` around it, sharing one DOM id. */}
      <Button variant={variant} size="sm" fullWidth={fullWidth}>
        <LogOut className="size-3.5" aria-hidden />
        Sign out
      </Button>

      <AlertDialog.Backdrop>
        <AlertDialog.Container placement="center" size="sm">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Heading>Sign out?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              You&rsquo;ll be returned to the sign-in page. Your saved stories stay where they are.
            </AlertDialog.Body>
            <AlertDialog.Footer>
              {/* `slot="close"` rather than wrapping in `AlertDialog.CloseTrigger`,
                  which would nest a duplicate pressable the same way. */}
              <Button variant="ghost" slot="close">
                Cancel
              </Button>
              {/* Still a real form post so sign-out clears the cookie server-side. */}
              <form action="/auth/signout" method="post">
                <Button type="submit" variant="primary">
                  Sign out
                </Button>
              </form>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
