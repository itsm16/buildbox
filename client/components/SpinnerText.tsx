import { Spinner } from './ui/spinner'

export default function SpinnerText(props: {className?: string, text?: string}) {
  const {className, text} = props;

  return (
    <div className={`flex gap-2 items-center ${className}`}><Spinner/>{text}</div>
  )
}
