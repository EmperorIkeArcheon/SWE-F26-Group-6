import { Leaf } from 'lucide-react'

export function Brand() {
  return (
    <a className="brand" href="#main">
      <span className="brand-mark">
        <Leaf size={23} strokeWidth={2.2} />
      </span>
      <span>
        Nutri<span className="brand-light">Gator</span>
        <small>A LITTLE BETTER, EVERY DAY</small>
      </span>
    </a>
  )
}
