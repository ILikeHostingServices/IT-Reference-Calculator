/* RAID.js - RAID / JBOD capacity and fault-tolerance calculations.
   Assumes uniform per-disk size (standard assumption for this kind of calculator),
   except JBOD which also supports mixed sizes via rawTotalBytes when provided. */
window.Calc = window.Calc || {};

Calc.RAID = (function () {
  "use strict";

  // Each level: minDisks, whether it needs a "groups" (sub-array count) param,
  // a capacity(n, size, groups) -> usable bytes function, and fault tolerance text.
  const LEVELS = {
    jbod: {
      label: "JBOD (spanning)",
      minDisks: 1,
      needsGroups: false,
      capacity: (n, size) => n * size,
      tolerance: () => "None - loss of any disk loses data on that disk (no striping, no parity)",
      notes: "Concatenates disks into one volume. No redundancy, no performance benefit.",
    },
    raid0: {
      label: "RAID 0 (striping)",
      minDisks: 2,
      needsGroups: false,
      capacity: (n, size) => n * size,
      tolerance: () => "None - any single disk failure loses the entire array",
      notes: "Striping only. Maximizes capacity and speed, zero redundancy.",
    },
    raid1: {
      label: "RAID 1 (mirroring)",
      minDisks: 2,
      needsGroups: false,
      capacity: (n, size) => size,
      tolerance: (n) => `Up to ${n - 1} disk(s) - survives as long as one mirror copy remains`,
      notes: "All disks mirror the same data. Capacity is limited to one disk's worth.",
    },
    raid1e: {
      label: "RAID 1E (striped mirroring)",
      minDisks: 3,
      needsGroups: false,
      capacity: (n, size) => Math.floor(n / 2) * size,
      tolerance: () => "At least 1 disk guaranteed (multiple possible, depends on which disks fail)",
      notes: "Mirrored stripes across an odd or even number of disks.",
    },
    raid2: {
      label: "RAID 2 (bit-level striping, Hamming ECC)",
      minDisks: 3,
      needsGroups: false,
      capacity: (n, size) => Math.max(0, n - Math.ceil(Math.log2(n))) * size,
      tolerance: () => "1 disk (theoretical) - relies on dedicated ECC disks",
      notes: "Obsolete/theoretical: uses dedicated Hamming-code ECC disks. Not used in practice - modern disks have built-in ECC. Shown for completeness only.",
    },
    raid3: {
      label: "RAID 3 (byte-level striping, dedicated parity)",
      minDisks: 3,
      needsGroups: false,
      capacity: (n, size) => (n - 1) * size,
      tolerance: () => "1 disk (the dedicated parity disk)",
      notes: "Legacy: dedicated parity disk, byte-level striping. Rarely implemented today.",
    },
    raid4: {
      label: "RAID 4 (block-level striping, dedicated parity)",
      minDisks: 3,
      needsGroups: false,
      capacity: (n, size) => (n - 1) * size,
      tolerance: () => "1 disk (the dedicated parity disk)",
      notes: "Like RAID 5 but with a single dedicated (non-rotating) parity disk - that disk is a write bottleneck.",
    },
    raid5: {
      label: "RAID 5 (distributed parity)",
      minDisks: 3,
      needsGroups: false,
      capacity: (n, size) => (n - 1) * size,
      tolerance: () => "1 disk",
      notes: "Parity is distributed across all disks. Most common single-parity RAID.",
    },
    raid6: {
      label: "RAID 6 (dual distributed parity)",
      minDisks: 4,
      needsGroups: false,
      capacity: (n, size) => (n - 2) * size,
      tolerance: () => "2 disks",
      notes: "Dual parity, distributed. Tolerates two simultaneous disk failures.",
    },
    raid10: {
      label: "RAID 10 (1+0, striped mirrors)",
      minDisks: 4,
      needsGroups: false,
      requiresEven: true,
      capacity: (n, size) => (n / 2) * size,
      tolerance: () => "At least 1 disk guaranteed; up to half the disks if one per mirror pair",
      notes: "Stripe of mirrors. Requires an even disk count.",
    },
    raid50: {
      label: "RAID 50 (5+0, striped RAID 5 sets)",
      minDisks: 6,
      needsGroups: true,
      defaultGroups: 2,
      groupMin: 3,
      capacity: (n, size, groups) => (n - groups) * size,
      tolerance: (n, groups) => `1 disk per group (${groups} groups) - up to ${groups} total, one per group`,
      notes: "Striped set of RAID 5 arrays. Each group needs its own minimum of 3 disks.",
    },
    raid60: {
      label: "RAID 60 (6+0, striped RAID 6 sets)",
      minDisks: 8,
      needsGroups: true,
      defaultGroups: 2,
      groupMin: 4,
      capacity: (n, size, groups) => (n - 2 * groups) * size,
      tolerance: (n, groups) => `2 disks per group (${groups} groups) - up to ${2 * groups} total, two per group`,
      notes: "Striped set of RAID 6 arrays. Each group needs its own minimum of 4 disks.",
    },
    raidz1: {
      label: "RAID-Z1 (ZFS, single parity)",
      minDisks: 3,
      needsGroups: false,
      capacity: (n, size) => (n - 1) * size,
      tolerance: () => "1 disk",
      notes: "ZFS equivalent of RAID 5. Avoids the RAID 5 'write hole' via copy-on-write.",
    },
    raidz2: {
      label: "RAID-Z2 (ZFS, dual parity)",
      minDisks: 4,
      needsGroups: false,
      capacity: (n, size) => (n - 2) * size,
      tolerance: () => "2 disks",
      notes: "ZFS equivalent of RAID 6.",
    },
    raidz3: {
      label: "RAID-Z3 (ZFS, triple parity)",
      minDisks: 5,
      needsGroups: false,
      capacity: (n, size) => (n - 3) * size,
      tolerance: () => "3 disks",
      notes: "Triple parity - no direct traditional-RAID equivalent. Highest ZFS redundancy tier.",
    },
  };

  function getLevel(key) {
    const level = LEVELS[key];
    if (!level) throw new Error(`Unknown RAID level "${key}"`);
    return level;
  }

  // diskCount: integer, diskSizeBytes: bytes per disk (uniform), groups: only for 50/60.
  function calculate(levelKey, diskCount, diskSizeBytes, groups) {
    const level = getLevel(levelKey);

    if (!Number.isInteger(diskCount) || diskCount < 1) {
      throw new Error("Disk count must be a positive integer");
    }
    if (diskCount < level.minDisks) {
      throw new Error(`${level.label} requires at least ${level.minDisks} disks`);
    }
    if (level.requiresEven && diskCount % 2 !== 0) {
      throw new Error(`${level.label} requires an even number of disks`);
    }
    if (!(diskSizeBytes > 0)) {
      throw new Error("Disk size must be greater than 0");
    }

    let g = 1;
    if (level.needsGroups) {
      g = groups || level.defaultGroups;
      if (!Number.isInteger(g) || g < 2) {
        throw new Error(`${level.label} requires at least 2 groups`);
      }
      if (diskCount % g !== 0) {
        throw new Error(`Disk count (${diskCount}) must divide evenly across ${g} groups`);
      }
      const perGroup = diskCount / g;
      if (perGroup < level.groupMin) {
        throw new Error(`Each group needs at least ${level.groupMin} disks (currently ${perGroup} per group)`);
      }
    }

    const rawBytes = diskCount * diskSizeBytes;
    const usableBytes = level.capacity(diskCount, diskSizeBytes, g);
    const efficiencyPct = rawBytes > 0 ? (usableBytes / rawBytes) * 100 : 0;

    return {
      level: levelKey,
      label: level.label,
      diskCount,
      diskSizeBytes,
      groups: level.needsGroups ? g : undefined,
      rawBytes,
      usableBytes,
      overheadBytes: rawBytes - usableBytes,
      efficiencyPct,
      faultTolerance: level.tolerance(diskCount, g),
      notes: level.notes,
      minDisks: level.minDisks,
    };
  }

  function listLevels() {
    return Object.entries(LEVELS).map(([key, l]) => ({
      key,
      label: l.label,
      minDisks: l.minDisks,
      needsGroups: !!l.needsGroups,
    }));
  }

  return { LEVELS, getLevel, calculate, listLevels };
})();
