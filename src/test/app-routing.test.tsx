import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { Route as IndexRoute } from "@/routes/index";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("renders the full TradingDeskRoute cockpit without runtime errors", () => {
    const Comp = IndexRoute.options.component!;
    render(<Comp />);
    expect(screen.getByText("BUILD")).toBeTruthy();
    expect(screen.getByText("AUCTION")).toBeTruthy();
    expect(screen.getByText("ROLL DICE")).toBeTruthy();
    expect(screen.getAllByText(/Summergate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Diamond Hills/i).length).toBeGreaterThan(0);
  });
});
