# provenance.py
# Returns the commit the Cicero template library is currently checked out at,
# so every results file can record which version of the gold answers it scored
# against. Pinned commit is documented in TEMPLATE_LIBRARY_PIN.md.
import os, subprocess

TEMPLATE_LIBRARY_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "cicero-template-library")
PINNED_COMMIT = "3afcccc683e13ced6a22a9740c2fd2d63a6a697c"  # see TEMPLATE_LIBRARY_PIN.md


def template_library_commit():
    """The SHA the template library is checked out at now (falls back to the pinned SHA)."""
    try:
        sha = subprocess.check_output(
            ["git", "-C", TEMPLATE_LIBRARY_DIR, "rev-parse", "HEAD"],
            text=True, stderr=subprocess.DEVNULL).strip()
        return sha or PINNED_COMMIT
    except Exception:
        return PINNED_COMMIT
