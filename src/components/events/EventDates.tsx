const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
})

// Une date, ou « du <début> au <fin> » quand la fin tombe un autre jour (fuseau Europe/Paris).
export const EventDates = ({ startsAt, endsAt }: { startsAt: Date; endsAt?: Date | null }) => {
  const start = dateFormatter.format(startsAt)
  const end = endsAt ? dateFormatter.format(endsAt) : null
  if (!endsAt || end === start) {
    return <time dateTime={startsAt.toISOString()}>{start}</time>
  }
  return (
    <>
      du <time dateTime={startsAt.toISOString()}>{start}</time> au{' '}
      <time dateTime={endsAt.toISOString()}>{end}</time>
    </>
  )
}
