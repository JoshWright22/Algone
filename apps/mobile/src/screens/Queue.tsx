import { useNav } from "../nav";
import { openUrl } from "../openUrl";
import { store } from "../store";
import { useStored } from "../theme";
import { Body, Button, Card, Row, Screen } from "../ui";

export function QueueScreen() {
  const nav = useNav();
  const { queue } = useStored();
  return (
    <Screen title="Queue">
      {queue.length === 0 ? <Body muted>Nothing saved yet.</Body> : null}
      {queue.map((q, i) => (
        <Card key={q.id}>
          <Body>{q.title}</Body>
          <Body muted size={12}>{q.url}</Body>
          <Row>
            <Button kind="primary" label="Open" onPress={() => openUrl(q.url, nav.push)} />
            <Button label="Up" disabled={i === 0} onPress={() => void store.queueMove(q.id, -1)} />
            <Button label="Down" disabled={i === queue.length - 1} onPress={() => void store.queueMove(q.id, 1)} />
            <Button label="Remove" onPress={() => void store.queueRemove(q.id)} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
