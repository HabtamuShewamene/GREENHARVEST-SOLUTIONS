const request = require("supertest");

const { createHeaderAuthMiddleware } = require("./helpers/mockAuthMiddleware");

const loadReviewService = () => {
  jest.resetModules();

  jest.doMock("../src/models/productModel", () => ({
    findProductById: jest.fn(),
  }));
  jest.doMock("../src/models/reviewModel", () => ({
    createReview: jest.fn(),
    deleteReviewById: jest.fn(),
    findReviewById: jest.fn(),
    findReviewByProductAndUser: jest.fn(),
    getProductReviewSummary: jest.fn(),
    getProductReviews: jest.fn(),
    updateReviewById: jest.fn(),
  }));

  const productModel = require("../src/models/productModel");
  const reviewModel = require("../src/models/reviewModel");
  const reviewService = require("../src/services/reviewService");

  return { productModel, reviewModel, reviewService };
};

const loadNotificationService = () => {
  jest.resetModules();

  jest.doMock("../src/models/agentModel", () => ({
    findUserById: jest.fn(),
  }));
  jest.doMock("../src/models/notificationModel", () => ({
    createNotificationForAllUsers: jest.fn(),
    createNotificationForUser: jest.fn(),
    getNotificationsByUserId: jest.fn(),
    markNotificationAsRead: jest.fn(),
  }));

  const agentModel = require("../src/models/agentModel");
  const notificationModel = require("../src/models/notificationModel");
  const notificationService = require("../src/services/notificationService");

  return { agentModel, notificationModel, notificationService };
};

const buildReviewApp = (reviewServiceMock) => {
  jest.resetModules();
  jest.doMock("../src/services/reviewService", () => reviewServiceMock);
  jest.doMock("../src/middleware/authMiddleware", () => createHeaderAuthMiddleware());

  const reviewRoutes = require("../src/routes/reviewRoutes");
  const { createRouteApp } = require("./helpers/createRouteApp");

  return createRouteApp("/api/reviews", reviewRoutes);
};

const buildNotificationApp = (notificationServiceMock) => {
  jest.resetModules();
  jest.doMock("../src/services/notificationService", () => notificationServiceMock);
  jest.doMock("../src/middleware/authMiddleware", () => createHeaderAuthMiddleware());

  const notificationRoutes = require("../src/routes/notificationRoutes");
  const { createRouteApp } = require("./helpers/createRouteApp");

  return createRouteApp("/api/notifications", notificationRoutes);
};

describe("Review API", () => {
  describe("reviewService", () => {
    test("buyer adds a review successfully", async () => {
      const { productModel, reviewModel, reviewService } = loadReviewService();

      productModel.findProductById.mockResolvedValue({ id: 6, name: "Tomato" });
      reviewModel.findReviewByProductAndUser.mockResolvedValue(null);
      reviewModel.createReview.mockResolvedValue({
        id: 30,
        product_id: 6,
        user_id: 4,
        rating: 5,
        comment: "Fresh produce",
      });

      const review = await reviewService.addReview({
        user: { id: 4, role: "buyer" },
        payload: { product_id: 6, rating: 5, comment: " Fresh produce " },
      });

      expect(reviewModel.createReview).toHaveBeenCalledWith({
        product_id: 6,
        user_id: 4,
        rating: 5,
        comment: "Fresh produce",
      });
      expect(review.rating).toBe(5);
    });

    test("rejects invalid product ids, duplicate reviews, and invalid ratings", async () => {
      const { productModel, reviewModel, reviewService } = loadReviewService();

      await expect(
        reviewService.addReview({
          user: { id: 4, role: "buyer" },
          payload: { product_id: "1 OR 1=1", rating: 5 },
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Valid product_id is required",
      });

      await expect(
        reviewService.addReview({
          user: { id: 4, role: "buyer" },
          payload: { product_id: 6, rating: 6 },
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "rating must be an integer between 1 and 5",
      });

      productModel.findProductById.mockResolvedValue({ id: 6, name: "Tomato" });
      reviewModel.findReviewByProductAndUser.mockResolvedValue({ id: 88 });
      await expect(
        reviewService.addReview({
          user: { id: 4, role: "buyer" },
          payload: { product_id: 6, rating: 5 },
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "You have already reviewed this product",
      });
    });

    test("updates own review and blocks edits from other users", async () => {
      const { reviewModel, reviewService } = loadReviewService();

      reviewModel.findReviewById.mockResolvedValueOnce({
        id: 5,
        user_id: 4,
      });
      reviewModel.updateReviewById.mockResolvedValueOnce({
        id: 5,
        rating: 4,
        comment: "Still good",
      });

      const review = await reviewService.updateReview({
        user: { id: 4, role: "buyer" },
        review_id: 5,
        payload: { rating: 4, comment: " Still good " },
      });

      expect(reviewModel.updateReviewById).toHaveBeenCalledWith(5, {
        rating: 4,
        comment: "Still good",
      });
      expect(review.rating).toBe(4);

      reviewModel.findReviewById.mockResolvedValueOnce({
        id: 6,
        user_id: 9,
      });
      await expect(
        reviewService.updateReview({
          user: { id: 4, role: "buyer" },
          review_id: 6,
          payload: { comment: "nope" },
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "You can only update your own review",
      });
    });

    test("admin can delete another user's review and product reviews are summarized", async () => {
      const { productModel, reviewModel, reviewService } = loadReviewService();

      reviewModel.findReviewById.mockResolvedValueOnce({
        id: 7,
        user_id: 12,
      });
      reviewModel.deleteReviewById.mockResolvedValue(undefined);

      const deleted = await reviewService.deleteReview({
        user: { id: 1, role: "admin" },
        review_id: 7,
      });

      expect(reviewModel.deleteReviewById).toHaveBeenCalledWith(7);
      expect(deleted.deleted).toBe(true);

      productModel.findProductById.mockResolvedValue({ id: 6, name: "Tomato" });
      reviewModel.getProductReviewSummary.mockResolvedValue({
        average_rating: "4.50",
        total_reviews: 2,
      });
      reviewModel.getProductReviews.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const response = await reviewService.getProductReviews(6);

      expect(response.product.name).toBe("Tomato");
      expect(response.total_reviews).toBe(2);
      expect(response.reviews).toHaveLength(2);
    });
  });

  describe("review routes", () => {
    let app;
    let reviewServiceMock;

    beforeEach(() => {
      reviewServiceMock = {
        addReview: jest.fn(),
        deleteReview: jest.fn(),
        getProductReviews: jest.fn(),
        updateReview: jest.fn(),
      };

      app = buildReviewApp(reviewServiceMock);
    });

    test("adds a review through the API", async () => {
      reviewServiceMock.addReview.mockResolvedValue({
        id: 4,
        rating: 5,
      });

      const response = await request(app)
        .post("/api/reviews")
        .set("x-test-role", "buyer")
        .send({ product_id: 6, rating: 5, comment: "Great" });

      expect(response.status).toBe(201);
      expect(response.body.review.rating).toBe(5);
    });

    test("review creation requires authentication", async () => {
      const response = await request(app)
        .post("/api/reviews")
        .send({ product_id: 6, rating: 5 });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Authentication is required");
    });

    test("maps invalid rating errors", async () => {
      reviewServiceMock.addReview.mockRejectedValue(
        Object.assign(new Error("rating must be an integer between 1 and 5"), {
          statusCode: 400,
        })
      );

      const response = await request(app)
        .post("/api/reviews")
        .set("x-test-role", "buyer")
        .send({ product_id: 6, rating: 6 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("rating must be an integer between 1 and 5");
    });

    test("fetches product reviews publicly", async () => {
      reviewServiceMock.getProductReviews.mockResolvedValue({
        product: { id: 6, name: "Tomato" },
        average_rating: "4.50",
        total_reviews: 2,
        reviews: [{ id: 1 }, { id: 2 }],
      });

      const response = await request(app).get("/api/reviews/product/6");

      expect(response.status).toBe(200);
      expect(response.body.total_reviews).toBe(2);
    });
  });
});

describe("Notification API", () => {
  describe("notificationService", () => {
    test("admin creates a notification for a single user", async () => {
      const { agentModel, notificationModel, notificationService } = loadNotificationService();

      agentModel.findUserById.mockResolvedValue({ id: 8 });
      notificationModel.createNotificationForUser.mockResolvedValue({
        id: 41,
        user_id: 8,
        title: "Payment",
        message: "Payment received",
        type: "payment",
      });

      const result = await notificationService.createNotification({
        actor: { id: 1, role: "admin" },
        payload: {
          user_id: 8,
          title: "Payment",
          message: "Payment received",
          type: "payment",
        },
      });

      expect(result.count).toBe(1);
      expect(result.notifications[0].user_id).toBe(8);
    });

    test("admin creates broadcast notifications with default title and type", async () => {
      const { notificationModel, notificationService } = loadNotificationService();

      notificationModel.createNotificationForAllUsers.mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);

      const result = await notificationService.createNotification({
        actor: { id: 1, role: "admin" },
        payload: {
          message: "Orders updated",
        },
      });

      expect(notificationModel.createNotificationForAllUsers).toHaveBeenCalledWith({
        title: "Notification",
        message: "Orders updated",
        type: "general",
      });
      expect(result.count).toBe(2);
    });

    test("rejects unauthorized creators, invalid user ids, and missing messages", async () => {
      const { notificationService } = loadNotificationService();

      await expect(
        notificationService.createNotification({
          actor: { id: 4, role: "buyer" },
          payload: { message: "Hi" },
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Only admins can create notifications",
      });

      await expect(
        notificationService.createNotification({
          actor: { id: 1, role: "admin" },
          payload: { message: "   " },
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "message is required",
      });

      await expect(
        notificationService.createNotification({
          actor: { id: 1, role: "admin" },
          payload: { user_id: "bad", message: "Hi" },
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "user_id must be a valid integer",
      });
    });

    test("gets notifications and marks them as read", async () => {
      const { notificationModel, notificationService } = loadNotificationService();

      notificationModel.getNotificationsByUserId.mockResolvedValue([{ id: 9 }]);
      const notifications = await notificationService.getNotifications(4);
      expect(notifications).toHaveLength(1);

      await expect(
        notificationService.markAsRead({
          user_id: 4,
          notification_id: "9 OR 1=1",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid notification id",
      });

      notificationModel.markNotificationAsRead.mockResolvedValueOnce(null);
      await expect(
        notificationService.markAsRead({
          user_id: 4,
          notification_id: 99,
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Notification not found",
      });

      notificationModel.markNotificationAsRead.mockResolvedValueOnce({
        id: 9,
        is_read: true,
      });
      const notification = await notificationService.markAsRead({
        user_id: 4,
        notification_id: 9,
      });
      expect(notification.is_read).toBe(true);
    });
  });

  describe("notification routes", () => {
    let app;
    let notificationServiceMock;

    beforeEach(() => {
      notificationServiceMock = {
        createNotification: jest.fn(),
        getNotifications: jest.fn(),
        markAsRead: jest.fn(),
      };

      app = buildNotificationApp(notificationServiceMock);
    });

    test("admin creates notifications through the API", async () => {
      notificationServiceMock.createNotification.mockResolvedValue({
        count: 1,
        notifications: [{ id: 1, user_id: 8 }],
      });

      const response = await request(app)
        .post("/api/notifications")
        .set("x-test-role", "admin")
        .send({ user_id: 8, message: "Payment received" });

      expect(response.status).toBe(201);
      expect(response.body.notification.user_id).toBe(8);
    });

    test("notification routes require authentication", async () => {
      const response = await request(app).get("/api/notifications");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Authentication is required");
    });

    test("returns notifications for the authenticated user", async () => {
      notificationServiceMock.getNotifications.mockResolvedValue([{ id: 9 }]);

      const response = await request(app)
        .get("/api/notifications")
        .set("x-test-role", "buyer");

      expect(response.status).toBe(200);
      expect(response.body.notifications).toHaveLength(1);
    });

    test("marks notifications as read via both route aliases", async () => {
      notificationServiceMock.markAsRead
        .mockResolvedValueOnce({ id: 9, is_read: true })
        .mockResolvedValueOnce({ id: 10, is_read: true });

      const patchResponse = await request(app)
        .patch("/api/notifications/9/read")
        .set("x-test-role", "buyer");

      const putResponse = await request(app)
        .put("/api/notifications/read/10")
        .set("x-test-role", "buyer");

      expect(patchResponse.status).toBe(200);
      expect(patchResponse.body.notification.is_read).toBe(true);
      expect(putResponse.status).toBe(200);
      expect(putResponse.body.notification.is_read).toBe(true);
    });
  });
});
