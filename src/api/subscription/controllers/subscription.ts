/**
 * subscription controller
 */

import { factories } from "@strapi/strapi";
const { sanitize } = require("@strapi/utils");

function checkEnd(months, lastUpdatedTime) {
  const currentDate = new Date();
  const subscriptionEndDate = new Date(lastUpdatedTime);

  // Add the specified number of months to the lastUpdatedDate
  subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + months);

  // Check if the new date is greater than the current date
  return currentDate > subscriptionEndDate;
}

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

        if (results?.subscription_plan?.planName !== "Free") {
          const months = results?.subscription_plan?.timeDuration;
          const lastUpdatedTime = results?.updatedAt;
          const isExpired = checkEnd(months, lastUpdatedTime);
          if (isExpired) {
            // Get "Free" Subscription plans details
            const freeSubscriptionPlanDetails = await strapi.db
              .query("api::subscription-plan.subscription-plan")
              .findOne({
                where: { planName: "Free" },
              });
            if (!freeSubscriptionPlanDetails) {
              return ctx.badRequest(
                'Ask Admin to set a "Free" subscription plan'
              );
            }
            await strapi.entityService.update(
              "api::subscription.subscription",
              results.id,
              {
                data: {
                  subscription_plan: freeSubscriptionPlanDetails.id,
                  users_permissions_user: user.id,
                },
              }
            );
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

    // async update(ctx) {
    //   try {
    //     const user = ctx.state.user;
    //     const id = ctx.params.id;
    //     let result: any;
    //     const userSubscriptionData = await strapi.db
    //       .query("api::subscription.subscription")
    //       .findOne({
    //         where: { users_permissions_user: user.id },
    //       });
    //     if (!userSubscriptionData) {
    //       return ctx.badRequest("Something went wrong");
    //     }
    //     if (user.role.name === "Admin") {
    //       result = await strapi.entityService.update(
    //         "api::subscription.subscription",
    //         id,
    //         {
    //           data: {
    //             ...ctx.request.body,
    //           },
    //           ...ctx.query,
    //         }
    //       );
    //     } else {
    //       result = await strapi.entityService.update(
    //         "api::subscription.subscription",
    //         userSubscriptionData.id,
    //         {
    //           data: {
    //             ...ctx.request.body,
    //             users_permissions_user: user.id,
    //           },
    //           ...ctx.query,
    //         }
    //       );
    //     }
    //     return await sanitize.contentAPI.output(
    //       result,
    //       strapi.contentType("api::subscription.subscription"),
    //       {
    //         auth: ctx.state.auth,
    //       }
    //     );
    //   } catch (err) {
    //     return ctx.badRequest(`Subscription Update Error: ${err.message}`);
    //   }
    // },
  })
);
