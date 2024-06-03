/**
 * payment controller
 */

import { factories } from "@strapi/strapi";
const { sanitize } = require("@strapi/utils");

//phonePe initialization
const crypto = require("crypto");
const axios = require("axios");

export default factories.createCoreController(
  "api::payment.payment",
  ({ strapi }) => ({
    async initiatePayment(ctx) {
      const url = process.env.APP_URL;
      try {
        let merchantTransactionId = ctx.request.body.transactionId;

        const data = {
          merchantId: process.env.MERCHANT_ID,
          merchantTransactionId: merchantTransactionId,
          name: ctx.request.body.name,
          amount: ctx.request.body.amount * 100,
          redirectUrl: `${url}/payment/${merchantTransactionId}`,
          redirectMode: "POST",
          mobileNumber: ctx.request.body.phone,
          paymentInstrument: {
            type: "PAY_PAGE",
          },
        };

        const payload = JSON.stringify(data);
        const payloadMain = Buffer.from(payload).toString("base64");
        const keyIndex = 1;
        const string = payloadMain + "/pg/v1/pay" + process.env.SALT_KEY;
        const sha256 = crypto.createHash("sha256").update(string).digest("hex");
        const checksum = sha256 + "###" + keyIndex;

        // const prod_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay"
        const prod_URL =
          "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";

        const options = {
          method: "POST",
          url: prod_URL,
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            "X-VERIFY": checksum,
          },
          data: {
            request: payloadMain,
          },
        };

        await axios(options)
          .then(async function (response) {
            // console.log(response.data)
            // return res.json(response.data)
            const result = response.data;
            ctx.send(response.data);
          })
          .catch(function (error) {
            console.log(error);
          });
      } catch (err) {
        return ctx.badRequest(`Something Went wrong: ${err.message}`);
      }
    },

    async paymentCallback(ctx) {
      const merchantTransactionId = ctx.params.id;
      const merchantId = process.env.MERCHANT_ID;
      const user = ctx.state.user;
      const { subscriptionPlanId } = ctx.request.body;

      const keyIndex = 1;
      const string =
        `/pg/v1/status/${merchantId}/${merchantTransactionId}` +
        process.env.SALT_KEY;
      const sha256 = crypto.createHash("sha256").update(string).digest("hex");
      const checksum = sha256 + "###" + keyIndex;

      const options = {
        method: "GET",
        url: `https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status/${merchantId}/${merchantTransactionId}`,
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
          "X-MERCHANT-ID": `${merchantId}`,
        },
      };

      await axios
        .request(options)
        .then(async function (response) {
          if (response.data.success === true) {
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
                return ctx.badRequest(
                  'Ask Admin to set a "Free" subscription plan'
                );
              }
              //Payment Create
              await strapi.entityService.create("api::payment.payment", {
                // @ts-ignore
                data: {
                  status: "Success",
                  subscription: userSubscriptionData.id,
                },
                ...ctx.query,
              });
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
            } catch (err) {
              return ctx.badRequest(`Payment create Error: ${err.message}`);
            }
            ctx.send({ success: true, message: "Payment Success" });
          } else {
            ctx.send({ success: false, message: "Payment Failure" });
          }
        })
        .catch(function (error) {
          console.log(error);
        });
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
