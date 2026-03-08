import { html, fixture, expect } from '@open-wc/testing';
import '../node-detail-view';

describe('pxa-node-detail-view', () => {
  it('should set node property on LXC containers for navigation', async () => {
    const el = await fixture(
      html`<pxa-node-detail-view .node=${'proxmox'}></pxa-node-detail-view>`
    );
    // Simulate containers returned from API without node property
    const containers = [
      { vmid: 101, name: 'ct1', type: 'lxc', status: 'running', cpu: 0.1, maxcpu: 2, mem: 512 * 1024 * 1024, maxmem: 1024 * 1024 * 1024, disk: 0, maxdisk: 0, netin: 0, netout: 0, uptime: 1000 },
    ];
    // Patch the _lxcTask to immediately return our containers
    el._lxcTask = { render: ({ complete }: any) => complete(containers) };
    await el.updateComplete;
    const rows = el.shadowRoot.querySelectorAll('.section .table-card tbody tr');
    expect(rows.length).to.equal(1);
    // Simulate click and check navigation URL
    let navUrl = '';
    el.navigate = (url: string) => { navUrl = url; };
    rows[0].dispatchEvent(new Event('click'));
    expect(navUrl).to.include('/lxc/proxmox/101');
  });

  it('should set node property on VMs for navigation', async () => {
    const el = await fixture(
      html`<pxa-node-detail-view .node=${'proxmox'}></pxa-node-detail-view>`
    );
    // Simulate VMs returned from API without node property
    const vms = [
      { vmid: 100, name: 'vm1', type: 'qemu', status: 'running', cpu: 0.2, maxcpu: 2, mem: 1024 * 1024 * 1024, maxmem: 2048 * 1024 * 1024, disk: 0, maxdisk: 0, netin: 0, netout: 0, uptime: 2000, diskread: 0, diskwrite: 0 },
    ];
    // Patch the _qemuTask to immediately return our VMs
    el._qemuTask = { render: ({ complete }: any) => complete(vms) };
    await el.updateComplete;
    const rows = el.shadowRoot.querySelectorAll('.section .table-card tbody tr');
    expect(rows.length).to.equal(1);
    // Simulate click and check navigation URL
    let navUrl = '';
    el.navigate = (url: string) => { navUrl = url; };
    rows[0].dispatchEvent(new Event('click'));
    expect(navUrl).to.include('/vm/proxmox/100');
  });
});
