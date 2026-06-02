# ── Build stage ────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY WorkshopOrif.Api/WorkshopOrif.Api.csproj WorkshopOrif.Api/
RUN dotnet restore WorkshopOrif.Api/WorkshopOrif.Api.csproj

COPY WorkshopOrif.Api/ WorkshopOrif.Api/
RUN dotnet publish WorkshopOrif.Api/WorkshopOrif.Api.csproj \
    -c Release -o /app/publish --no-restore

# ── Runtime stage ───────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "WorkshopOrif.Api.dll"]
