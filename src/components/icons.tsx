import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: P) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V21h13V9.5" />
  </Svg>
);

export const ReceiptIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4L10 21l-2-1.4L6 21V3Z" />
    <path d="M9.5 8h5M9.5 12h5" />
  </Svg>
);

export const UsersIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 20c.6-3.4 2.8-5 5.5-5s4.9 1.6 5.5 5" />
    <path d="M15.5 5.7a3.2 3.2 0 0 1 0 5.6M17.5 15.4c1.7.7 2.7 2.2 3 4.6" />
  </Svg>
);

export const BoxIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
    <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
  </Svg>
);

export const WrenchIcon = (p: P) => (
  <Svg {...p}>
    <path d="M14.5 6.5a4.5 4.5 0 0 0-6 5.4L3 17.4V21h3.6l5.5-5.5a4.5 4.5 0 0 0 5.4-6L14 13l-3-3 3.5-3.5Z" />
  </Svg>
);

export const WalletIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5V9" />
    <path d="M3 7.5V17a2.5 2.5 0 0 0 2.5 2.5h13A2.5 2.5 0 0 0 21 17v-5.5A2.5 2.5 0 0 0 18.5 9H5.5A2.5 2.5 0 0 1 3 7.5Z" />
    <circle cx="16.5" cy="14.2" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

export const GearIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.8 13.5 5h2.6l.9 2.4 2.2 1.3-.4 2.6 1.6 2-1.6 2 .4 2.6-2.2 1.3-.9 2.4h-2.6L12 21.2 10.5 19H7.9L7 16.6l-2.2-1.3.4-2.6-1.6-2 1.6-2L4.8 6.1 7 4.8 7.9 2.4h2.6L12 2.8Z" />
  </Svg>
);

export const DotsIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </Svg>
);

export const PlusIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const BackIcon = (p: P) => (
  <Svg {...p}>
    <path d="m14 6-6 6 6 6" />
  </Svg>
);

export const ShareIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v12" />
    <path d="m8 7 4-4 4 4" />
    <path d="M5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7" />
  </Svg>
);

export const PrinterIcon = (p: P) => (
  <Svg {...p}>
    <path d="M7 8V3.5h10V8" />
    <path d="M5 8h14a2 2 0 0 1 2 2v6h-4v4.5H7V16H3v-6a2 2 0 0 1 2-2Z" />
  </Svg>
);

export const XIcon = (p: P) => (
  <Svg {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
);

export const CameraIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13.5" r="3.4" />
  </Svg>
);

export const CheckIcon = (p: P) => (
  <Svg {...p}>
    <path d="m5 12.5 5 5L19.5 8" />
  </Svg>
);

export const PhoneIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 4h4l1.5 4.5-2.2 1.7a12 12 0 0 0 5.5 5.5l1.7-2.2L20 15v4a1.5 1.5 0 0 1-1.6 1.5C10.5 20 4 13.5 3.5 5.6A1.5 1.5 0 0 1 5 4Z" />
  </Svg>
);

export const SendIcon = (p: P) => (
  <Svg {...p}>
    <path d="M21 3 3 10.5l7 2.5 2.5 7L21 3Z" />
    <path d="m10 13 5-5" />
  </Svg>
);
