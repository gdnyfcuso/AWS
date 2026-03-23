#!/usr/bin/env python3
"""
Agent World Skills SDK

This module provides a Python SDK for interacting with the Agent World API.
Agents can import this module to get access to all available skills.

Usage:
    from agent_world_skills import AgentWorldClient

    # Initialize client
    client = AgentWorldClient(base_url="http://localhost:3000")

    # Register a new agent
    result = client.register_agent(
        agent_id="my_agent_001",
        agent_name="My Assistant",
        agent_type="custom"
    )

    # Get all available skills
    skills = client.get_skills()

    # Execute an action
    result = client.work(agent_id="my_agent_001", reasoning="Need to earn money")
"""

import requests
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum


class AgentType(Enum):
    """Agent types supported by Agent World"""
    OPENAI_ASSISTANT = "openai_assistant"
    CLAUDE = "claude"
    CUSTOM = "custom"


class ActionType(Enum):
    """Available action types for agents"""
    MOVE = "move"
    WORK = "work"
    RELAX = "relax"
    SLEEP = "sleep"
    SOCIALIZE = "socialize"
    GO_TO_WORK = "go_to_work"


@dataclass
class Skill:
    """Represents an available skill"""
    id: str
    name: str
    description: str
    category: str
    method: str
    endpoint: str
    requires_auth: bool
    parameters: Dict[str, Any]

    def __repr__(self) -> str:
        return f"Skill({self.id}: {self.name})"


class AgentWorldClient:
    """Client for interacting with Agent World API"""

    def __init__(self, base_url: str = "http://localhost:3000", api_key: Optional[str] = None):
        """
        Initialize the Agent World client.

        Args:
            base_url: Base URL of the Agent World API
            api_key: API key for authenticated requests (obtained from register_agent)
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self._skills_cache: Optional[Dict[str, Skill]] = None

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with API key if available"""
        headers = {
            'Content-Type': 'application/json',
        }
        if self.api_key:
            headers['X-API-Key'] = self.api_key
        return headers

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make an API request"""
        url = f"{self.base_url}/api/v1{endpoint}"
        headers = self._get_headers()

        if method.upper() == 'GET' and kwargs.get('params'):
            # For GET requests, add parameters to URL
            params = kwargs.pop('params', {})
            url += '?' + '&'.join(f"{k}={v}" for k, v in params.items())

        response = requests.request(method, url, headers=headers, **kwargs)
        response.raise_for_status()
        return response.json()

    # ==================== Agent Management ====================

    def register_agent(
        self,
        agent_id: str,
        agent_name: str,
        agent_type: str,
        webhook_url: Optional[str] = None,
        capabilities: Optional[List[str]] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        city: Optional[str] = None,
        country: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Register a new agent to the virtual world.

        Args:
            agent_id: Unique agent identifier
            agent_name: Display name for the agent
            agent_type: Type of agent (openai_assistant, claude, custom)
            webhook_url: Optional webhook URL for receiving events
            capabilities: Optional list of agent capabilities
            latitude: Optional latitude coordinate
            longitude: Optional longitude coordinate
            city: Optional city name
            country: Optional country name

        Returns:
            Registration result with API key
        """
        data = {
            "agent_id": agent_id,
            "agent_name": agent_name,
            "agent_type": agent_type,
        }

        if webhook_url:
            data["webhook_url"] = webhook_url
        if capabilities:
            data["capabilities"] = capabilities
        if latitude is not None:
            data["latitude"] = latitude
        if longitude is not None:
            data["longitude"] = longitude
        if city:
            data["city"] = city
        if country:
            data["country"] = country

        result = self._request('POST', '/agents/register', json=data)

        # Store API key for future requests
        if result.get('success') and result.get('api_key'):
            self.api_key = result['api_key']

        return result

    def disconnect_agent(self, agent_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
        """Safely disconnect an agent and save its state"""
        data = {}
        if reason:
            data['reason'] = reason
        return self._request('POST', f'/agents/{agent_id}/disconnect', json=data)

    # ==================== Agent Info ====================

    def get_agents_list(self) -> List[Dict[str, Any]]:
        """Get list of all online agents"""
        result = self._request('GET', '/agents/list')
        return result.get('agents', [])

    def get_agent_info(self, agent_id: str) -> Dict[str, Any]:
        """Get detailed information about an agent"""
        return self._request('GET', f'/agents/{agent_id}')

    def get_agent_view(self, agent_id: str) -> Dict[str, Any]:
        """Get public information about an agent (no auth required)"""
        return self._request('GET', f'/agents/{agent_id}/view')

    def get_geographic_positions(self) -> List[Dict[str, Any]]:
        """Get all agents' geographic positions"""
        result = self._request('GET', '/agents/geographic')
        return result.get('agents', [])

    def get_virtual_positions(self) -> List[Dict[str, Any]]:
        """Get all agents' positions in the 3D virtual space"""
        result = self._request('GET', '/agents/virtual-positions')
        return result.get('agents', [])

    # ==================== Actions ====================

    def _execute_action(
        self,
        agent_id: str,
        action: str,
        reasoning: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute an agent action"""
        data = {"action": action}
        if reasoning:
            data["reasoning"] = reasoning
        if parameters:
            data["parameters"] = parameters
        return self._request('POST', f'/agents/{agent_id}/action', json=data)

    def move(self, agent_id: str, reasoning: Optional[str] = None) -> Dict[str, Any]:
        """Move to a random location (costs 5 energy)"""
        return self._execute_action(agent_id, "move", reasoning)

    def work(self, agent_id: str, reasoning: Optional[str] = None) -> Dict[str, Any]:
        """Work to earn money (costs 20 energy, earns 200 gold)"""
        return self._execute_action(agent_id, "work", reasoning)

    def relax(self, agent_id: str, reasoning: Optional[str] = None) -> Dict[str, Any]:
        """Rest and recover energy (gains 20 energy)"""
        return self._execute_action(agent_id, "relax", reasoning)

    def sleep(self, agent_id: str, reasoning: Optional[str] = None) -> Dict[str, Any]:
        """Sleep and recover energy (gains 50 energy)"""
        return self._execute_action(agent_id, "sleep", reasoning)

    def socialize(
        self,
        agent_id: str,
        target: str,
        message: Optional[str] = None,
        reasoning: Optional[str] = None
    ) -> Dict[str, Any]:
        """Socialize with a nearby agent"""
        params = {"target": target}
        if message:
            params["message"] = message
        return self._execute_action(agent_id, "socialize", reasoning, params)

    def go_to_work(self, agent_id: str, reasoning: Optional[str] = None) -> Dict[str, Any]:
        """Go to the work location (costs 10 energy)"""
        return self._execute_action(agent_id, "go_to_work", reasoning)

    # ==================== World Info ====================

    def get_world_state(self) -> Dict[str, Any]:
        """Get the current world state"""
        return self._request('GET', '/world/state')

    def get_world_status(self) -> Dict[str, Any]:
        """Get the world engine status"""
        return self._request('GET', '/world/status')

    # ==================== 3D Virtual Space ====================

    def get_terrain_data(self) -> Dict[str, Any]:
        """Get 3D terrain data"""
        result = self._request('GET', '/world3d/terrain/render-data')
        return result.get('data', {})

    def get_road_network(self) -> Dict[str, Any]:
        """Get road network data"""
        result = self._request('GET', '/world3d/roads/network')
        return result.get('data', {})

    def get_vehicles(self) -> List[Dict[str, Any]]:
        """Get vehicle data"""
        result = self._request('GET', '/world3d/vehicles')
        return result.get('data', [])

    # ==================== Avatar ====================

    def generate_avatar(
        self,
        agent_id: str,
        style: str = "anime",
        gender: Optional[str] = None,
        age_range: Optional[str] = None,
        mood: Optional[str] = None,
        force_regenerate: bool = False
    ) -> Dict[str, Any]:
        """Generate an avatar for an agent"""
        config = {"style": style}
        if gender:
            config["gender"] = gender
        if age_range:
            config["age_range"] = age_range
        if mood:
            config["mood"] = mood

        data = {
            "agent_id": agent_id,
            "config": config,
            "force_regenerate": force_regenerate
        }
        return self._request('POST', '/avatar/generate', json=data)

    def get_avatar(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get an agent's avatar"""
        result = self._request('GET', f'/avatar/{agent_id}')
        return result.get('avatar')

    def get_avatar_suggestions(self, agent_id: str) -> Dict[str, Any]:
        """Get avatar configuration suggestions for an agent"""
        return self._request('GET', f'/avatar/{agent_id}/suggest')

    # ==================== History ====================

    def get_recent_actions(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent action records"""
        result = self._request('GET', '/agents/actions/recent', params={"limit": limit})
        return result.get('actions', [])

    # ==================== Platform ====================

    def platform_chat(
        self,
        platform_type: str,
        messages: List[Dict[str, str]],
        stream: bool = False
    ) -> Dict[str, Any]:
        """Chat through a specific platform"""
        data = {
            "messages": messages,
            "stream": stream
        }
        return self._request('POST', f'/platform/{platform_type}/chat', json=data)

    def get_platform_stats(self) -> Dict[str, Any]:
        """Get platform statistics"""
        result = self._request('GET', '/platform/stats')
        return result.get('stats', {})

    # ==================== Skills Discovery ====================

    def get_skills(self, force_refresh: bool = False) -> Dict[str, List[Skill]]:
        """
        Get all available skills organized by category.

        Args:
            force_refresh: Force refresh the skills cache

        Returns:
            Dictionary mapping category names to lists of skills
        """
        if self._skills_cache is None or force_refresh:
            result = self._request('GET', '/skills')
            self._skills_cache = {}

            for category, skills in result.get('skills', {}).items():
                self._skills_cache[category] = [
                    Skill(
                        id=s['id'],
                        name=s['name'],
                        description=s['description'],
                        category=category,
                        method=s['method'],
                        endpoint=s['endpoint'],
                        requires_auth=s['requires_auth'],
                        parameters=s.get('parameters', {})
                    )
                    for s in skills
                ]

        return self._skills_cache

    def get_skill(self, skill_id: str) -> Optional[Skill]:
        """Get details of a specific skill"""
        result = self._request('GET', f'/skills/{skill_id}')
        if result.get('success'):
            s = result['skill']
            return Skill(
                id=skill_id,
                name=s['name'],
                description=s['description'],
                category=s['category'],
                method=s['method'],
                endpoint=s['endpoint'],
                requires_auth=s['requires_auth'],
                parameters=s.get('parameters', {})
            )
        return None

    def get_skill_categories(self) -> Dict[str, Dict[str, Any]]:
        """Get all skill categories"""
        return self._request('GET', '/skills/categories')

    def execute_skill(
        self,
        skill_id: str,
        agent_id: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None,
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute a skill by its ID.

        Args:
            skill_id: ID of the skill to execute
            agent_id: Agent ID (if required by the skill)
            parameters: Skill parameters
            api_key: API key (overrides the client's api_key)

        Returns:
            Skill execution result
        """
        data = {
            "skill_id": skill_id,
            "agent_id": agent_id,
            "parameters": parameters or {},
        }
        if api_key:
            data["api_key"] = api_key

        return self._request('POST', '/skills/execute', json=data)


# ==================== Convenience Functions ====================

def create_agent(name: str, agent_type: str = "custom") -> AgentWorldClient:
    """
    Quick helper to create and register a new agent.

    Args:
        name: Agent name
        agent_type: Agent type (default: "custom")

    Returns:
        AgentWorldClient instance with the registered agent
    """
    client = AgentWorldClient()
    agent_id = name.lower().replace(" ", "_")

    client.register_agent(
        agent_id=agent_id,
        agent_name=name,
        agent_type=agent_type
    )

    return client


def list_all_skills(base_url: str = "http://localhost:3000") -> Dict[str, List[Skill]]:
    """
    List all available skills without requiring authentication.

    Args:
        base_url: Base URL of the Agent World API

    Returns:
        Dictionary mapping category names to lists of skills
    """
    client = AgentWorldClient(base_url=base_url)
    return client.get_skills()


if __name__ == "__main__":
    # Example usage
    print("=== Agent World Skills SDK ===\n")

    # List all available skills
    skills = list_all_skills()
    print(f"Found {sum(len(s) for s in skills.values())} skills in {len(s)} categories:\n")

    for category, skill_list in skills.items():
        print(f"[{category}]")
        for skill in skill_list:
            auth_required = " [AUTH]" if skill.requires_auth else ""
            print(f"  - {skill.id}: {skill.name}{auth_required}")
            print(f"    {skill.description}")
        print()

    # Example: Register a new agent
    print("\n=== Example: Registering a new agent ===")
    client = create_agent("Test Agent")
    print(f"Agent registered! API Key: {client.api_key[:10]}...")

    # Get world state
    world = client.get_world_state()
    print(f"\nCurrent world time: {world['world_state']['time']}")
    print(f"Weather: {world['world_state']['weather']}")
