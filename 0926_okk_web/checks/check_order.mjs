import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../public/admin/order.js', import.meta.url), 'utf8');
const { moveRow } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
function fixture(visible = ['a', 'b', 'c']) {
    const items = ['a', 'trash', 'b', 'c'].map(id => ({ id, trashed: id === 'trash' }));
    const list = {
        children: visible.map(id => ({ getAttribute: () => id })),
        insertBefore(row, before) {
            this.children.splice(this.children.indexOf(row), 1);
            this.children.splice(before ? this.children.indexOf(before) : this.children.length, 0, row);
        },
    };
    return { items, list };
}
const ids = list => list.children.map(row => row.getAttribute());
const { items, list } = fixture();
const originalNodes = [...list.children];
let finish, calls = 0;
const pending = moveRow(items, 'b', 'up', list, 'data-id', order => {
    calls++;
    assert.deepEqual(order, ['b', 'a', 'c']);
    return new Promise(resolve => { finish = resolve; });
});
assert.deepEqual(ids(list), ['b', 'a', 'c']); // Visible before the server responds.
assert.equal(list.children[0], originalNodes[1]);
finish();
assert.equal(await pending, true);
assert.equal(calls, 1);
assert.equal(await moveRow(items, 'b', 'up', list, 'data-id', () => { throw Error('boundary request'); }), false);
await assert.rejects(moveRow(items, 'b', 'down', list, 'data-id', async () => { throw Error('save failed'); }), /save failed/);
assert.deepEqual(ids(list), ['b', 'a', 'c']);
assert.deepEqual(items.map(item => item.id), ['b', 'trash', 'a', 'c']);
const filtered = fixture(['a', 'c']);
await moveRow(filtered.items, 'c', 'up', filtered.list, 'data-client-id', async order => {
    assert.deepEqual(order, ['a', 'c', 'b']);
});
assert.deepEqual(ids(filtered.list), ['a', 'c']);
console.log('PASS: immediate row move, node reuse, single save, boundaries, rollback, filtered rows');
