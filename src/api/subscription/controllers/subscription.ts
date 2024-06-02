/**
 * subscription controller
 */

import { factories } from "@strapi/strapi";
const { sanitize } = require("@strapi/utils");

export default factories.createCoreController(
  "api::subscription.subscription",
  ({ strapi }) => ({
    async find(ctx) {
      let results: any;
      const user = ctx.state.user;
      try {
        if (ctx.state.user.role.name === "Admin") {
          results = await strapi.entityService.findMany(
            "api::subscription.subscription",
            {
              ...ctx.query,
            }
          );
        } else {
          results = await strapi.db
            .query("api::subscription.subscription")
            .findOne({
              where: { users_permissions_user: user.id },
              populate: { subscription_plan: true },
            });
          if (!results) {
            return ctx.badRequest("Your Subscription Data not found");
          }
        }
        return await sanitize.contentAPI.output(
          results,
          strapi.contentType("api::subscription.subscription"),
          {
            auth: ctx.state.auth,
          }
        );
      } catch (err) {
        return ctx.badRequest(`Subscription Find Error: ${err.message}`);
      }
    },

    async update(ctx) {
      try {
        const user = ctx.state.user;
        const id = ctx.params.id;
        let result: any;
        const userSubscriptionData = await strapi.db
          .query("api::subscription.subscription")
          .findOne({
            where: { users_permissions_user: user.id },
          });
        if (!userSubscriptionData) {
          return ctx.badRequest("Something went wrong");
        }
        if (user.role.name === "Admin") {
          result = await strapi.entityService.update(
            "api::subscription.subscription",
            id,
            {
              data: {
                ...ctx.request.body,
              },
              ...ctx.query,
            }
          );
        } else {
          result = await strapi.entityService.update(
            "api::subscription.subscription",
            userSubscriptionData.id,
            {
              data: {
                ...ctx.request.body,
                users_permissions_user: user.id,
              },
              ...ctx.query,
            }
          );
        }
        return await sanitize.contentAPI.output(
          result,
          strapi.contentType("api::subscription.subscription"),
          {
            auth: ctx.state.auth,
          }
        );
      } catch (err) {
        return ctx.badRequest(`Subscription Update Error: ${err.message}`);
      }
    },
  })
);
