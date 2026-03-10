import { memo, useEffect, useState } from "react";

export default memo(function SymbolGlyph({
  emoji,
  imageUrl,
  size = 32,
  style,
  title,
}) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

  if (imageUrl && !hasImageError) {
    return (
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        loading="lazy"
        title={title}
        onError={() => setHasImageError(true)}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          display: "block",
          ...style,
        }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      title={title}
      style={{
        width: typeof size === "number" ? size : undefined,
        height: typeof size === "number" ? size : undefined,
        fontSize: size,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {emoji}
    </span>
  );
});
