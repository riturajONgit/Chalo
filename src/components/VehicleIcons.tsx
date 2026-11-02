import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

/**
 * Sedan: side profile of a 4-door saloon with a boot (trunk).
 */
export const SedanIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size, ...props }) => (
  <svg
    viewBox="0 0 48 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width={size}
    height={size}
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Body outline: low front hood, angled windshield, roof, rear window, distinct trunk/boot */}
    <path d="M2 15h3.5l1.5-3.5 8-0.5 4.5-5 13-0.5 5 5.5 7 0.5 2 3.5h1.5v3H43" />
    <path d="M2 15v3h6" />
    <path d="M16 18h16" />
    <path d="M40 18h6v-3" />
    {/* Windows: 4-door saloon division with B-pillar */}
    <path d="M17.5 6.5l-3.5 4.5h6v-4.5h-2.5z" fill="currentColor" fillOpacity="0.15" />
    <path d="M21.5 6.5v4.5h6.5v-4.5h-6.5z" fill="currentColor" fillOpacity="0.15" />
    <path d="M29.5 6.5v4.5h4.5l-3.5-4.5h-1z" fill="currentColor" fillOpacity="0.15" />
    {/* Door seam lines */}
    <path d="M21 11v6.5" strokeOpacity="0.6" />
    <path d="M29 11v6.5" strokeOpacity="0.6" />
    {/* Front Wheel */}
    <circle cx="12" cy="18" r="3.5" fill="#0A0A0A" />
    <circle cx="12" cy="18" r="1.5" fill="currentColor" />
    {/* Rear Wheel */}
    <circle cx="36" cy="18" r="3.5" fill="#0A0A0A" />
    <circle cx="36" cy="18" r="1.5" fill="currentColor" />
  </svg>
);

/**
 * SUV: taller, boxier profile with a roof rack.
 */
export const SuvIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size, ...props }) => (
  <svg
    viewBox="0 0 48 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width={size}
    height={size}
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Roof rack */}
    <line x1="16" y1="2" x2="34" y2="2" strokeWidth="1.75" />
    <line x1="18" y1="2" x2="18" y2="4" strokeWidth="1.5" />
    <line x1="25" y1="2" x2="25" y2="4" strokeWidth="1.5" />
    <line x1="32" y1="2" x2="32" y2="4" strokeWidth="1.5" />
    
    {/* Boxy body outline: upright front, blunt hood, steep windshield, flat roof, vertical rear hatch */}
    <path d="M2 14.5h4l2-3 8-0.5 4-7h18l1.5 10.5h4.5v3H43" />
    <path d="M2 14.5v3h6" />
    <path d="M16 17.5h16" />
    <path d="M40 17.5h6v-3" />
    
    {/* Boxy SUV Windows */}
    <path d="M18.5 5.5l-3 4.5h6v-4.5h-3z" fill="currentColor" fillOpacity="0.15" />
    <path d="M23 5.5v4.5h6v-4.5h-6z" fill="currentColor" fillOpacity="0.15" />
    <path d="M30.5 5.5v4.5h4.5l-0.8-4.5h-3.7z" fill="currentColor" fillOpacity="0.15" />
    
    {/* Door seam */}
    <path d="M22.5 10v6.5" strokeOpacity="0.6" />
    <path d="M30 10v6.5" strokeOpacity="0.6" />
    
    {/* Chunky SUV Wheels */}
    <circle cx="12" cy="17.5" r="4" fill="#0A0A0A" strokeWidth="1.75" />
    <circle cx="12" cy="17.5" r="1.5" fill="currentColor" />
    <circle cx="36" cy="17.5" r="4" fill="#0A0A0A" strokeWidth="1.75" />
    <circle cx="36" cy="17.5" r="1.5" fill="currentColor" />
  </svg>
);

/**
 * Auto: three-wheeler auto rickshaw, single front wheel, canopy roof.
 */
export const AutoIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size, ...props }) => (
  <svg
    viewBox="0 0 48 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width={size}
    height={size}
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Canopy Roof & Cabin Outline */}
    {/* Canopy roof curve starting from windscreen top, arching over cabin and down back */}
    <path d="M16 4.5c4-1 16-1.5 22 0.5 2 0.8 3 2.5 3 4.5v6.5h-7" />
    {/* Front cowl & Windscreen */}
    <path d="M16 4.5l-4 7.5c-1 2-3 3-5 3h-2v3h4" />
    {/* Floorboard */}
    <path d="M13 18h16" />
    <path d="M37 18h4v-2" />
    {/* Front fork connecting to single front wheel */}
    <path d="M11 15l-2.5 3" />
    
    {/* Rickshaw side open entry / passenger enclosure */}
    <path d="M19 12v6" strokeOpacity="0.7" />
    <path d="M29 9v9" strokeOpacity="0.7" />
    <path d="M13 12h16" strokeOpacity="0.7" />
    {/* Front windscreen glass */}
    <path d="M15 6l-3 5.5h5v-5.5z" fill="currentColor" fillOpacity="0.2" />
    
    {/* Single Front Wheel */}
    <circle cx="8" cy="18" r="3" fill="#0A0A0A" strokeWidth="1.5" />
    <circle cx="8" cy="18" r="1" fill="currentColor" />
    
    {/* Rear Wheel (one visible from side profile) */}
    <circle cx="33" cy="18" r="3.5" fill="#0A0A0A" strokeWidth="1.5" />
    <circle cx="33" cy="18" r="1.2" fill="currentColor" />
  </svg>
);

/**
 * Bike: motorcycle with a rider silhouette.
 */
export const BikeIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size, ...props }) => (
  <svg
    viewBox="0 0 48 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width={size}
    height={size}
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Rider Silhouette */}
    {/* Helmet/Head */}
    <circle cx="23" cy="5" r="2.5" fill="currentColor" stroke="none" />
    {/* Torso leaning forward */}
    <path d="M22.5 7.5l-4 6 5 2" strokeWidth="2" stroke="currentColor" />
    {/* Arm extending forward to handlebar */}
    <path d="M20 9.5l8 2.5" strokeWidth="1.75" stroke="currentColor" />
    {/* Leg to footpeg */}
    <path d="M18.5 13.5l3 3.5" strokeWidth="1.75" stroke="currentColor" />
    
    {/* Motorcycle Frame & Tank */}
    {/* Handlebars */}
    <path d="M28 11.5l2-1.5" strokeWidth="2" />
    {/* Front fork to wheel */}
    <path d="M29 11l6 6.5" />
    {/* Frame, tank, seat */}
    <path d="M24 12c2-0.5 4 0 5 1l-6 3.5-8-1 6-3.5" fill="currentColor" fillOpacity="0.25" />
    {/* Rear swingarm */}
    <path d="M15 17.5l-5 0" />
    {/* Exhaust pipe */}
    <path d="M17 18h7l4-2" strokeOpacity="0.6" />
    
    {/* Rear Wheel */}
    <circle cx="10" cy="17.5" r="4" fill="#0A0A0A" strokeWidth="1.5" />
    <circle cx="10" cy="17.5" r="1.5" fill="currentColor" />
    
    {/* Front Wheel */}
    <circle cx="36" cy="17.5" r="4" fill="#0A0A0A" strokeWidth="1.5" />
    <circle cx="36" cy="17.5" r="1.5" fill="currentColor" />
  </svg>
);

/**
 * Universal VehicleIcon dispatcher
 */
export const VehicleIcon: React.FC<{ vehicle?: string; className?: string; size?: number }> = ({
  vehicle = 'sedan',
  className,
  size,
}) => {
  const v = (vehicle || '').toLowerCase();
  if (v === 'suv') return <SuvIcon className={className} size={size} />;
  if (v === 'auto') return <AutoIcon className={className} size={size} />;
  if (v === 'bike') return <BikeIcon className={className} size={size} />;
  return <SedanIcon className={className} size={size} />;
};
