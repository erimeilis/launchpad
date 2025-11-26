import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface AboutDialogProps {
  onClose: () => void;
}

export function AboutDialog({ onClose }: AboutDialogProps) {
  const { t } = useTranslation();

  const handleGitHubClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await invoke("plugin:opener|open_url", { url: "https://github.com/erimeilis/launchpad" });
    } catch (err) {
      console.error("Failed to open link:", err);
    }
  };

  return (
    <Modal onClose={onClose} padding="p-8" centered>
      <div className="mb-4 flex justify-center">
          <img src="/app-icon.png" alt="Launchpad" width="80" height="80" className="rounded-[18px]" />
        </div>

        <h1 className="m-0 mb-1 text-2xl font-semibold text-[var(--text-primary)]">Launchpad</h1>
        <p className="m-0 mb-4 text-[13px] text-[var(--text-tertiary)]">Version 0.7.0</p>

        <div className="mb-4 text-[14px] text-[var(--text-secondary)] leading-relaxed">
          <p className="m-0 mb-1">A recreation of the original macOS Launchpad</p>
          <p className="m-0">Full-screen app launcher with folders and custom organization</p>
        </div>

        <div className="mb-4">
          <a
            href="https://github.com/erimeilis/launchpad"
            onClick={handleGitHubClick}
            className="text-[14px] no-underline hover:underline text-[var(--accent-color)]"
          >
            GitHub Repository
          </a>
        </div>

        <div className="mb-6 text-[12px] text-[var(--text-tertiary)]">
          <p className="m-0 mb-0.5">© 2025 Launchpad Contributors</p>
          <p className="m-0">Licensed under MIT</p>
        </div>

      <Button
        onClick={onClose}
        variant="accent"
        className="px-6 py-2.5 text-[13px] font-medium"
      >
        {t("common.done", "Done")}
      </Button>
    </Modal>
  );
}
