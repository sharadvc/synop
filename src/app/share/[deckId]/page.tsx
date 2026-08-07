import { db } from '@/lib/db';
import SharedDeckView from '@/components/SharedDeckView';

export default async function SharePage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  const deck = await db.sharedDeck.findUnique({ where: { id: deckId } });
  if (!deck) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Deck not found</h1>
          <p className="text-sm text-foreground/50 mt-1">This shared deck doesn't exist or was removed.</p>
        </div>
      </div>
    );
  }

  // Count the view.
  try { await db.sharedDeck.update({ where: { id: deckId }, data: { views: { increment: 1 } } }); } catch {}

  let cards: { front: string; back: string }[] = [];
  try { cards = JSON.parse(deck.deck); } catch {}

  return <SharedDeckView title={deck.title} sourceUrl={deck.sourceUrl} deck={cards} />;
}
