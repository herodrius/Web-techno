export default function ProductImage({ item, ...props }) {
  const fallback = `/products/${item.categorie.toLowerCase()}.webp`
  const image = /^\/products\/(original|gold|red)\.png$/.test(item.image_url)
    ? item.image_url.replace('.png', '.webp')
    : item.image_url

  function utiliserImageDeSecours(event) {
    if (event.currentTarget.src.endsWith(fallback)) return
    event.currentTarget.src = fallback
  }

  return (
    <img
      src={image}
      alt={`Illustration ${item.nom}`}
      loading="lazy"
      decoding="async"
      onError={utiliserImageDeSecours}
      {...props}
    />
  )
}
