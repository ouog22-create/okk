// Keep browser Back inside the manager while an editor is open.
export function createEditorHistory({ close, run, isBusy }) {
    let active = false;
    let closingFromHistory = false;
    const push = () => history.pushState({ ...history.state, okkAdminEditor: true }, '', location.href);
    addEventListener('popstate', () => {
        if (!active) return;
        if (isBusy()) { push(); return; }
        closingFromHistory = true;
        run(async () => {
            try { await close(); }
            finally {
                closingFromHistory = false;
                // Cancellation or a failed list refresh must preserve the editor.
                if (active) push();
            }
        });
    });
    return {
        opened() {
            if (!active) push();
            active = true;
        },
        closed() {
            if (!active) return;
            active = false;
            if (!closingFromHistory) history.back();
        },
    };
}
