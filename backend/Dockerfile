# --- Build stage ---
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Cache dependencies separately from source so `docker build` only re-downloads
# the Maven repo when pom.xml actually changes.
COPY pom.xml .
RUN mvn -q dependency:go-offline

COPY src ./src
RUN mvn -q package -DskipTests

# --- Runtime stage ---
# 17-jre-alpine has no arm64 manifest at the time of writing; 21-jre-alpine
# does, and a JRE newer than the release target (17) runs Java 17 bytecode
# without any compatibility issues.
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S penny && adduser -S penny -G penny
COPY --from=build /app/target/penny.jar app.jar
RUN chown penny:penny app.jar
USER penny

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
