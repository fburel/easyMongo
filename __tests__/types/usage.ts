// Compile-only check of src/index.d.ts (run with `npm run typecheck`).
import { Connect, Configure, Disconnect, Model, Register, ObjectId, ModelInstance } from "../../src/index";

interface Post {
  title: string;
  rating?: number;
}

declare module "../../src/index" {
  interface Models {
    posts: ModelInstance<Post>;
  }
}

Configure({ uri: "mongodb://localhost", dbName: "test", clientOptions: { maxPoolSize: 5 } });

const posts = Model<Post>("Posts", { indexes: [{ key: { title: 1 }, unique: true }] });
posts.prototype.custom = function () { return 1; };
Register("posts", posts);

async function main() {
  const title: string = await Connect(async (mongo) => {
    const saved = await mongo.posts.saveAsync({ title: "a" });
    const id: string = saved._id;

    const found = await mongo.posts.getByIdAsync(id);
    const maybeTitle: string | undefined = found?.title;

    const page = await mongo.posts.fetchPageAsync({ rating: { $gt: 3 } }, { title: 1 }, null, 1, 10, { withTotal: true });
    const total: number = page.total + page.pageCount;

    const simple = await mongo.posts.fetchPageAsync();
    // @ts-expect-error total is only there with withTotal
    simple.total;

    // @ts-expect-error unknown field type
    await mongo.posts.saveAsync({ title: 1 });

    await mongo.posts.updateByIdAsync(ObjectId.from(id), { $set: { rating: 4 } });
    const up = await mongo.posts.upsertAsync({ title: "b" }, { $set: { rating: 1 } });
    const ok: boolean = await mongo.isConnected();

    // unregistered models are still accessible
    mongo.anything;

    return maybeTitle ?? String(total + (up?.rating ?? 0) + Number(ok));
  });

  await Disconnect();
  return title;
}

main();
