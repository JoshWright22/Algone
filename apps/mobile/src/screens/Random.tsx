import { useState } from "react";
import { pickRandom } from "@algone/core";
import { Body, Button, Card, Screen } from "../ui";

const roll = () => Math.floor(Math.random() * 2 ** 32);

export function RandomScreen() {
  const [item, setItem] = useState(() => pickRandom(roll()));
  const [answer, setAnswer] = useState(false);
  return (
    <Screen title="Random">
      <Card>
        <Body size={17}>{item.text}</Body>
        <Body muted size={13}>{item.source}</Body>
        {item.puzzle && !answer ? <Button label="Show answer" onPress={() => setAnswer(true)} /> : null}
        {item.puzzle && answer ? <Body strong>{item.puzzle.answer}</Body> : null}
      </Card>
      <Button
        label="Another"
        onPress={() => {
          setAnswer(false);
          setItem(pickRandom(roll()));
        }}
      />
    </Screen>
  );
}
