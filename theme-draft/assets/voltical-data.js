/* ============================================================
   VOLTICAL — voltical-data.js
   Single source of truth for spec sheets + capacity calculator.

   DATA STATUS
   Figures below come from the supplier listings imported into
   Shopify. Values ending in * are still category-typical
   ESTIMATES awaiting supplier confirmation — replace and delete
   the asterisk once confirmed. Device battery capacities are
   widely published teardown figures, rounded; the UI always
   labels calculator output as an estimate.
   ============================================================ */

window.VolticalData = {

  /* Spec-sheet rows per product handle. Values ending in * are
     estimates. Rendered by theme.js. */
  specsSheets: {
    'voltical-core-5k-10k': [
      ['Capacity', '5,000 / 10,000 mAh'],
      ['Magnetic output', '15 W'],
      ['Wired output', '20 W USB-C'],
      ['Input', '5V/3A · 9V/2A'],
      ['Attachment', 'Ring-aligned magnets'],
      ['Weight', '≈120 g (5K) · ≈180 g (10K)'],
      ['Size', '104 × 66 × 8.5 mm'],
      ['Recharge', 'USB-C']
    ],
    'voltical-core-pro-5k-10k': [
      ['Capacity', '5,000 / 10,000 mAh'],
      ['Magnetic output', '15 W*'],
      ['Max wired output', '20 W USB-C'],
      ['Charge readout', 'Live digital display'],
      ['Fast charge', 'Two-way quick charge'],
      ['Shell', 'Metal'],
      ['Battery', 'Li-polymer'],
      ['Certification', 'RoHS · CE · FCC']
    ],
    'voltical-puck-5k-10k': [
      ['Form', 'Foldable stand — desk or flat'],
      ['Charges', 'Phone + watch together'],
      ['Phone output', '15 W magnetic (15/10/7.5/5 W modes)'],
      ['Input', 'USB-C · 9V/3A or 12V/3A adapter'],
      ['Shell', 'ABS'],
      ['Warranty', '12 months']
    ],
    'voltical-watch-case': [
      ['Battery', '1,200 mAh polymer cell'],
      ['Delivered charge', '≈500 mAh to the watch'],
      ['Output', '2.5 W Watch magnetic'],
      ['Safety', '10-layer protection (overcharge, temp, short-circuit…)'],
      ['Status light', 'Green / yellow / red charge LED'],
      ['Fit', 'Sized per Watch model — see options'],
      ['Recharge', 'USB-C']
    ],
    'voltical-usb-c-charge-data-cable-new': [
      ['Connectors', 'USB-C to USB-C'],
      ['Power', 'Up to 60 W*'],
      ['Data', 'USB 2.0 · 480 Mbps*'],
      ['Lengths', '1 m / 2 m'],
      ['Jacket', 'Braided*']
    ],
    'voltical-watch-charge-cable': [
      ['Connectors', 'USB-C to Watch magnetic puck'],
      ['Build', 'Aluminium alloy · nylon braided'],
      ['Fast charge', 'With a 20 W USB-C adapter (Ultra / 9 / 8 / 7)'],
      ['Tested', '0→80% in ≈1.2 h on Series 8 (supplier test)'],
      ['Compatibility', 'Genuine Apple Watch only'],
      ['Length', '1 m*']
    ]
  },

  /* Efficiency assumptions (fraction of bank capacity that reaches
     the device battery). Conservative, industry-typical. */
  efficiency: { wireless: 0.60, wired: 0.82 },

  /* Products keyed by Shopify handle — powers the calculator.
     type 'charger' (Puck) has no battery: the calculator shows
     20→80% charge speed for iPhone + Watch instead of capacity.
     type 'cable' (USB-C cable) has no battery either — shows
     iPhone 20→80% speed, capped by the phone's own charging limit
     since it always needs the customer's own USB-C wall adapter.
     Uses iphonesUsbc (not iphones) since a USB-C–to–USB-C cable
     only physically works with USB-C iPhones (15 and later) — the
     Lightning models stay off this specific list.
     type 'watchcable' (Watch Charge Cable) shows Apple Watch
     0→80% speed, scaled off the supplier's tested anchor figure. */
  products: {
    'voltical-puck-5k-10k': {
      label: 'Voltical Puck',
      type: 'charger',
      wirelessW: 15,        // supplier: 15 W max phone output
      watchW: 2.5,          // estimated — typical watch pad output for this class
      estimated: true
    },
    'voltical-core-5k-10k': {
      label: 'Voltical Core',
      type: 'powerbank',
      wirelessW: 15,        // supplier sheet: 15 W wireless
      wiredW: 20,           // supplier sheet: 20 W wired
      capacities: { '5000': 5000, '10000': 10000 },
      estimated: false
    },
    'voltical-core-pro-5k-10k': {
      label: 'Voltical Core Pro',
      type: 'powerbank',
      wirelessW: 15,        // estimated — magnetic Qi ceiling for this class
      wiredW: 20,           // supplier: max output 20 W
      capacities: { '5000': 5000, '10000': 10000 },
      estimated: true
    },
    'voltical-watch-case': {
      label: 'Voltical Watch Case',
      type: 'watchcase',
      wirelessW: 2.5,       // supplier: 2.5 W Watch magnetic output
      /* 1,200 mAh cell ≈ 500 mAh delivered after conversion
         (supplier figure). 830 × 0.60 efficiency ≈ 500. */
      capacities: { 'default': 830 },
      estimated: false
    },
    'voltical-usb-c-charge-data-cable-new': {
      label: 'Voltical USB-C Cable',
      type: 'cable',
      /* Cable itself is rated up to 60 W*, but real-world speed is
         capped by whichever is lower: the customer's own USB-C
         wall adapter, or the iPhone's own charging ceiling — the
         calculator estimates using each iPhone's own stdW/fastW
         (see iphonesUsbc below). */
      cableMaxW: 60,
      estimated: true
    },
    'voltical-watch-charge-cable': {
      label: 'Voltical Watch Charge Cable',
      type: 'watchcable',
      /* Supplier-tested anchor: 0→80% in ≈1.2 h (72 min) on a
         Series 8 (308 mAh) using a 20 W adapter. Other watches are
         scaled off this anchor by battery size. Models without the
         fast-charge chipset (SE) charge roughly half the speed. */
      fastAnchorMins: 72,
      fastAnchorMah: 308,
      fastModels: ['Ultra', 'Series 10', 'Series 9', 'Series 8'],
      estimated: true
    }
  },

  /* iPhone battery capacities (mAh) — published teardown figures, rounded. */
  iphones: [
    { name: 'iPhone 17 Pro Max', mah: 5090 },
    { name: 'iPhone 17 Pro',     mah: 4250 },
    { name: 'iPhone 17',         mah: 3690 },
    { name: 'iPhone Air',        mah: 3150 },
    { name: 'iPhone 16 Pro Max', mah: 4685 },
    { name: 'iPhone 16 Pro',     mah: 3580 },
    { name: 'iPhone 16 Plus',    mah: 4675 },
    { name: 'iPhone 16',         mah: 3560 },
    { name: 'iPhone 16e',        mah: 4005 },
    { name: 'iPhone 15 Pro Max', mah: 4420 },
    { name: 'iPhone 15 Pro',     mah: 3275 },
    { name: 'iPhone 15 Plus',    mah: 4385 },
    { name: 'iPhone 15',         mah: 3350 },
    { name: 'iPhone 14 Pro Max', mah: 4325 },
    { name: 'iPhone 14 Pro',     mah: 3200 },
    { name: 'iPhone 14',         mah: 3280 },
    { name: 'iPhone 13',         mah: 3230 },
    { name: 'iPhone 13 mini',    mah: 2405 },
    { name: 'iPhone 12',         mah: 2815 },
    { name: 'iPhone SE (3rd gen)', mah: 2018 }
  ],

  /* USB-C iPhones only (15 and later — the models a USB-C–to–USB-C
     cable can physically plug into). stdW is the ceiling with any
     ordinary 20 W USB-C adapter; fastW is the ceiling only reachable
     with a higher-wattage USB-C PD/PPS "fast" charger — Apple's own
     20 W guidance covers the fast-charge-to-50%-in-~30-min claim for
     every model, but the Pro-tier phones (bigger batteries, PPS
     support) keep accepting meaningfully more power past that, so a
     fancier brick buys them a real chunk of extra speed. Standard and
     Plus models plateau at 20 W regardless of the adapter — fastW
     equals stdW for those, so the calculator shows "No faster". */
  iphonesUsbc: [
    { name: 'iPhone 17 Pro Max', mah: 5090, stdW: 20, fastW: 40 },
    { name: 'iPhone 17 Pro',     mah: 4250, stdW: 20, fastW: 33 },
    { name: 'iPhone 17',         mah: 3690, stdW: 20, fastW: 20 },
    { name: 'iPhone Air',        mah: 3150, stdW: 20, fastW: 27 },
    { name: 'iPhone 16 Pro Max', mah: 4685, stdW: 20, fastW: 37 },
    { name: 'iPhone 16 Pro',     mah: 3580, stdW: 20, fastW: 32 },
    { name: 'iPhone 16 Plus',    mah: 4675, stdW: 20, fastW: 20 },
    { name: 'iPhone 16',         mah: 3560, stdW: 20, fastW: 20 },
    { name: 'iPhone 16e',        mah: 4005, stdW: 20, fastW: 20 },
    { name: 'iPhone 15 Pro Max', mah: 4420, stdW: 20, fastW: 35 },
    { name: 'iPhone 15 Pro',     mah: 3275, stdW: 20, fastW: 30 },
    { name: 'iPhone 15 Plus',    mah: 4385, stdW: 20, fastW: 20 },
    { name: 'iPhone 15',         mah: 3350, stdW: 20, fastW: 20 }
  ],

  /* Apple Watch battery capacities (mAh), rounded, + rated all-day hours. */
  watches: [
    { name: 'Apple Watch Ultra 2',        mah: 564, hours: 36 },
    { name: 'Apple Watch Ultra',          mah: 542, hours: 36 },
    { name: 'Apple Watch Series 10 46mm', mah: 382, hours: 18 },
    { name: 'Apple Watch Series 10 42mm', mah: 327, hours: 18 },
    { name: 'Apple Watch Series 9 45mm',  mah: 308, hours: 18 },
    { name: 'Apple Watch Series 9 41mm',  mah: 282, hours: 18 },
    { name: 'Apple Watch Series 8 45mm',  mah: 308, hours: 18 },
    { name: 'Apple Watch Series 8 41mm',  mah: 282, hours: 18 },
    { name: 'Apple Watch SE (2nd gen) 44mm', mah: 296, hours: 18 },
    { name: 'Apple Watch SE (2nd gen) 40mm', mah: 245, hours: 18 }
  ]
};
