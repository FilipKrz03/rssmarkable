import { z } from "zod";

import {
  getUserDeviceHandler,
  registerDeviceHandler,
  unregisterDeviceHandler,
} from "src/server/controllers/user.controller";
import { getUserFeeds } from "src/server/services/user.service";
import { registerDeviceSchema } from "src/utils/validation";

import { router, protectedProcedure } from "../trpc";

export const userRouter = router({
  getUserFeeds: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .query(({ input }) => getUserFeeds(input)),
  registerDevice: protectedProcedure
    .input(registerDeviceSchema)
    .mutation(({ input, ctx }) =>
      registerDeviceHandler({ ...input, email: ctx.session.user.email }),
    ),
  unregisterDevice: protectedProcedure.mutation(({ ctx }) =>
    unregisterDeviceHandler({ email: ctx.session.user.email }),
  ),
  getUserDevice: protectedProcedure.query(({ ctx }) =>
    getUserDeviceHandler({ email: ctx.session.user.email }),
  ),
});
