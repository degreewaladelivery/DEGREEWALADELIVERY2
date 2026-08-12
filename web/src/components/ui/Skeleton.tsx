import './Skeleton.css';

export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div className="skel-rows" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skel-row">
          <div className="skeleton skel-row__thumb" />
          <div className="skel-row__info">
            <div className="skeleton skel-line skel-line--title" />
            <div className="skeleton skel-line skel-line--sub" />
            <div className="skeleton skel-line skel-line--price" />
          </div>
          <div className="skeleton skel-row__action" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="skel-cards" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skel-card">
          <div className="skeleton skel-card__thumb" />
          <div className="skel-card__body">
            <div className="skeleton skel-line skel-line--title" />
            <div className="skeleton skel-line skel-line--sub" />
          </div>
        </div>
      ))}
    </div>
  );
}
