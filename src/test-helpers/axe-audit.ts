import axe from "axe-core";

/** Fail the test when axe reports serious or critical WCAG 2.1 A/AA violations. */
export async function assertNoSeriousAxeViolations(container: Element): Promise<void> {
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
  });
  const serious = results.violations.filter(
    violation => violation.impact === "serious" || violation.impact === "critical",
  );
  if (serious.length === 0) return;
  const details = serious
    .flatMap(violation =>
      violation.nodes.map(node => `${violation.id} on ${node.html?.slice(0, 120) ?? node.target.join(" ")}`),
    )
    .join("\n");
  throw new Error(
    serious
      .map(violation => `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`)
      .join("\n") + (details ? `\n${details}` : ""),
  );
}
