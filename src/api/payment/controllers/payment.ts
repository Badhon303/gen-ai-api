/**
 * payment controller
 */

import { factories } from "@strapi/strapi";
const { sanitize } = require("@strapi/utils");

export default factories.createCoreController(
  "api::payment.payment",
  ({ strapi }) => ({
    async initiatePayment(ctx) {
      console.log("initiatePayment called");
      return "initiatePayment called";
    },
    async paymentCallback(ctx) {
      console.log("paymentCallback called");
      return "paymentCallback called";
    },
    async create(ctx) {
      const user = ctx.state.user;
      const { status, subscriptionPlanId } = ctx.request.body;
      try {
        const userSubscriptionData = await strapi.db
          .query("api::subscription.subscription")
          .findOne({
            where: { users_permissions_user: user.id },
          });
        if (!userSubscriptionData) {
          return ctx.badRequest("Something went wrong");
        }
        // Get "Free" Subscription plans details
        const freeSubscriptionPlanDetails = await strapi.db
          .query("api::subscription-plan.subscription-plan")
          .findOne({
            where: { planName: "Free" },
          });
        if (!freeSubscriptionPlanDetails) {
          return ctx.badRequest('Ask Admin to set a "Free" subscription plan');
        }
        const result = await strapi.entityService.create(
          "api::payment.payment",
          {
            // @ts-ignore
            data: {
              status: status ? status : "",
              subscription: userSubscriptionData.id,
            },
            ...ctx.query,
          }
        );
        //update subscription plan
        await strapi.entityService.update(
          "api::subscription.subscription",
          userSubscriptionData.id,
          {
            data: {
              subscription_plan: subscriptionPlanId
                ? subscriptionPlanId
                : freeSubscriptionPlanDetails.id,
              users_permissions_user: user.id,
            },
            ...ctx.query,
          }
        );

        return await sanitize.contentAPI.output(
          result,
          strapi.contentType("api::payment.payment"),
          {
            auth: ctx.state.auth,
          }
        );
      } catch (err) {
        return ctx.badRequest(`Registration create Error: ${err.message}`);
      }
    },
    async find(ctx) {
      const user = ctx.state.user;
      let results: any;
      try {
        if (ctx.state.user.role.name === "Admin") {
          results = await strapi.entityService.findMany(
            "api::payment.payment",
            {
              ...ctx.query,
            }
          );
        } else {
          results = await strapi.entityService.findMany(
            "api::payment.payment",
            {
              filters: {
                subscription: {
                  users_permissions_user: user.id,
                },
              },
              populate: {
                subscription: { populate: { subscription_plan: true } },
              },
            }
          );
        }
        return await sanitize.contentAPI.output(
          results,
          strapi.contentType("api::payment.payment"),
          {
            auth: ctx.state.auth,
          }
        );
      } catch (err) {
        return ctx.badRequest(`Payment Find Error: ${err.message}`);
      }
    },
    async findOne(ctx) {
      const user = ctx.state.user;
      const id = ctx.params.id;
      const query = { ...ctx.query };
      if (!query.filters) {
        query.filters = {};
      }
      query.filters.users_permissions_user = user.id;
      let findOneResults: any;
      try {
        if (ctx.state.user.role.name === "Admin") {
          findOneResults = await strapi.entityService.findOne(
            "api::payment.payment",
            id,
            {
              ...ctx.query,
            }
          );
        } else {
          findOneResults = await strapi.db
            .query("api::payment.payment")
            .findOne({
              where: {
                id: id,
                subscription: {
                  users_permissions_user: user.id,
                },
              },
              populate: {
                subscription: { populate: { subscription_plan: true } },
              },
            });

          if (!findOneResults) {
            return ctx.unauthorized(
              "You are not authorized to perform this action."
            );
          }
        }
        return await sanitize.contentAPI.output(
          findOneResults,
          strapi.contentType("api::payment.payment"),
          {
            auth: ctx.state.auth,
          }
        );
      } catch (err) {
        return ctx.badRequest(`Exam find one Error: ${err.message}`);
      }
    },
  })
);
