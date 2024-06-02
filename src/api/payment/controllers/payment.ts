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
