// Reuse row nodes so reordering does not recreate thumbnails or editor controls.
export async function moveRow(items, id, direction, list, idAttribute, save) {
    const active = items.filter(item => !item.trashed);
    const index = active.findIndex(item => item.id === id);
    const next = index + (direction === 'up' ? -1 : 1);
    if (index < 0 || next < 0 || next >= active.length) return false;
    const first = items.indexOf(active[index]);
    const second = items.indexOf(active[next]);
    const originalRows = [...list.children];
    const rows = new Map(originalRows.map(row => [row.getAttribute(idAttribute), row]));
    [items[first], items[second]] = [items[second], items[first]];
    let position = 0;
    for (const item of items) {
        const row = rows.get(item.id);
        if (!row) continue;
        if (list.children[position] !== row) list.insertBefore(row, list.children[position] || null);
        position++;
    }
    try {
        await save(items.filter(item => !item.trashed).map(item => item.id));
    } catch (error) {
        [items[first], items[second]] = [items[second], items[first]];
        originalRows.forEach((row, index) => {
            if (list.children[index] !== row) list.insertBefore(row, list.children[index] || null);
        });
        throw error;
    }
    return true;
}
